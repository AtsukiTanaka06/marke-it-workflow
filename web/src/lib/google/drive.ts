import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";

// ─── OAuth2 クライアント生成 ──────────────────────────────────────────────────

export async function getOAuthClient(redirectUri?: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_settings")
    .select("google_oauth_client_id, google_oauth_client_secret_encrypted")
    .single();

  if (
    !data?.google_oauth_client_id ||
    !data?.google_oauth_client_secret_encrypted
  ) {
    throw new Error("Google OAuth クライアント ID / シークレットが未設定です");
  }

  const clientSecret = await decrypt(data.google_oauth_client_secret_encrypted);

  return new google.auth.OAuth2(
    data.google_oauth_client_id,
    clientSecret,
    redirectUri,
  );
}

async function getDriveClient() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_settings")
    .select("google_oauth_refresh_token_encrypted")
    .single();

  if (!data?.google_oauth_refresh_token_encrypted) {
    throw new Error(
      "Google アカウントが未認可です。設定画面で認可してください。",
    );
  }

  const refreshToken = await decrypt(data.google_oauth_refresh_token_encrypted);
  const oauth2Client = await getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // アクセストークン更新時に refresh_token も保存し直す（ローテーション対応）
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      const encrypted = await encrypt(tokens.refresh_token);
      const adminClient = createAdminClient();
      await adminClient
        .from("system_settings")
        .update({ google_oauth_refresh_token_encrypted: encrypted })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

async function getDocsClient() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_settings")
    .select("google_oauth_refresh_token_encrypted")
    .single();

  if (!data?.google_oauth_refresh_token_encrypted) {
    throw new Error("Google アカウントが未認可です");
  }

  const refreshToken = await decrypt(data.google_oauth_refresh_token_encrypted);
  const oauth2Client = await getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.docs({ version: "v1", auth: oauth2Client });
}

// ─── ドライブ設定取得 ─────────────────────────────────────────────────────────

export async function getDriveSettings(): Promise<{
  templateFolderId: string | null;
  workFolderId: string | null;
  clientIdSet: boolean;
  isAuthorized: boolean;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_settings")
    .select(
      "google_drive_template_folder_id, google_drive_work_folder_id, google_oauth_client_id, google_oauth_refresh_token_encrypted",
    )
    .single();

  return {
    templateFolderId: data?.google_drive_template_folder_id ?? null,
    workFolderId: data?.google_drive_work_folder_id ?? null,
    clientIdSet: !!data?.google_oauth_client_id,
    isAuthorized: !!data?.google_oauth_refresh_token_encrypted,
  };
}

// ─── テンプレートドライブ直下のフォルダ一覧 ──────────────────────────────────

export type DriveFolder = {
  id: string;
  name: string;
};

export async function listTemplateFolders(): Promise<DriveFolder[]> {
  const { templateFolderId } = await getDriveSettings();
  if (!templateFolderId) throw new Error("テンプレートドライブIDが未設定です");

  const drive = await getDriveClient();

  const folderCheck = await drive.files
    .get({
      fileId: templateFolderId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    })
    .catch((err: Error) => {
      throw new Error(
        `テンプレートフォルダへのアクセスに失敗しました: ${err.message}`,
      );
    });
  console.log("[drive] template folder:", folderCheck.data);

  const res = await drive.files.list({
    q: `'${templateFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    orderBy: "name",
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  console.log("[drive] folders found:", res.data.files?.length ?? 0);

  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
  }));
}

// ─── フォルダコピー（再帰） ────────────────────────────────────────────────────

async function copyFolderRecursive(
  drive: ReturnType<typeof google.drive>,
  sourceFolderId: string,
  destParentId: string,
  folderName: string,
  projectName: string,
  docs?: ReturnType<typeof google.docs>,
  replacements?: Record<string, string>,
): Promise<string> {
  const folderRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [destParentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  const newFolderId = folderRes.data.id!;
  console.log("[drive] created folder:", folderName, newFolderId);

  const listRes = await drive.files.list({
    q: `'${sourceFolderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const items = listRes.data.files ?? [];
  console.log(
    "[drive] items in",
    folderName,
    ":",
    items.map((i) => i.name),
  );

  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          await copyFolderRecursive(
            drive,
            item.id!,
            newFolderId,
            item.name!,
            projectName,
            docs,
            replacements,
          );
        } else {
          const newFileName = `【${projectName}御中】${item.name!}`;
          const copyRes = await drive.files.copy({
            fileId: item.id!,
            requestBody: {
              name: newFileName,
              parents: [newFolderId],
            },
            supportsAllDrives: true,
          });
          console.log("[drive] copied file:", item.name, "→", newFileName);

          // Google ドキュメントのみプレースホルダー置換
          if (
            item.mimeType === "application/vnd.google-apps.document" &&
            docs &&
            replacements &&
            Object.keys(replacements).length > 0
          ) {
            try {
              await docs.documents.batchUpdate({
                documentId: copyRes.data.id!,
                requestBody: {
                  requests: Object.entries(replacements).map(
                    ([placeholder, value]) => ({
                      replaceAllText: {
                        containsText: { text: placeholder, matchCase: true },
                        replaceText: value,
                      },
                    }),
                  ),
                },
              });
              console.log("[docs] replaced placeholders in:", newFileName);
            } catch (err) {
              console.warn(
                "[docs] placeholder replacement failed:",
                newFileName,
                err,
              );
            }
          }
        }
      } catch (err) {
        console.error("[drive] failed to copy item:", item.name, err);
      }
    }),
  );

  return newFolderId;
}

// ─── フォルダ内ファイル一覧（再帰） ───────────────────────────────────────────

export type DriveFile = {
  name: string;
  webViewLink: string;
};

async function listFilesRecursive(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  acc: DriveFile[] = [],
): Promise<DriveFile[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  for (const item of res.data.files ?? []) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      await listFilesRecursive(drive, item.id!, acc);
    } else if (item.name && item.webViewLink) {
      acc.push({ name: item.name, webViewLink: item.webViewLink });
    }
  }

  return acc;
}

/** コピー先フォルダ内の全ファイルを再帰的に列挙する */
export async function listFilesInFolder(
  folderId: string,
): Promise<DriveFile[]> {
  const drive = await getDriveClient();
  return listFilesRecursive(drive, folderId);
}

export async function copyTemplateFolder(
  sourceFolderId: string,
  sourceFolderName: string,
  projectName: string,
  replacements?: Record<string, string>,
): Promise<string> {
  const { workFolderId } = await getDriveSettings();
  if (!workFolderId) throw new Error("作業ドライブIDが未設定です");

  const drive = await getDriveClient();
  const docs =
    replacements && Object.keys(replacements).length > 0
      ? await getDocsClient()
      : undefined;

  const newFolderName = projectName;

  console.log("[drive] copying:", sourceFolderName, "→", newFolderName);
  const newFolderId = await copyFolderRecursive(
    drive,
    sourceFolderId,
    workFolderId,
    newFolderName,
    projectName,
    docs,
    replacements,
  );
  console.log("[drive] copy complete:", newFolderId);
  return newFolderId;
}
