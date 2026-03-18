// ============================================================
// Google Sheets API Client — Singleton
//
// Uses a Service Account (not OAuth user tokens) for server-side
// access. The service account email must be shared on the Sheets
// document with Editor permission.
//
// Exported functions are intentionally low-level (row arrays).
// Domain services (tasks, diary, etc.) build on top of this.
// ============================================================

import { google, sheets_v4 } from "googleapis";

let sheetsInstance: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsInstance) return sheetsInstance;

  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });
  return sheetsInstance;
}

const SPREADSHEET_ID = () => {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEETS_ID env var");
  return id;
};

// ---- Low-level CRUD operations -----------------------------

/**
 * Read all rows from a sheet (excludes header row 1).
 * Returns raw string[][] — parsers live in domain services.
 */
export async function readRows(
  sheetName: string,
  range = "A2:ZZ"
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!${range}`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return (response.data.values as string[][]) ?? [];
}

/**
 * Append a new row to the sheet.
 */
export async function appendRow(
  sheetName: string,
  values: (string | number | boolean)[]
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/**
 * Update a specific row by 1-based row index (header = row 1, first data = row 2).
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number, // 1-based, row 1 is headers
  values: (string | number | boolean)[]
): Promise<void> {
  const sheets = getSheetsClient();
  const colEnd = columnLetter(values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!A${rowIndex}:${colEnd}${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/**
 * Delete a row by its 1-based index (uses batchUpdate, not values API).
 * Note: Sheets API requires sheet ID, not name, for deletions.
 */
export async function deleteRow(
  sheetName: string,
  rowIndex: number // 1-based
): Promise<void> {
  const sheets = getSheetsClient();

  // First, resolve sheet name → sheet ID
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID(),
    fields: "sheets(properties(sheetId,title))",
  });

  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based for batchUpdate
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

/**
 * Initialize a sheet with headers if it doesn't have them yet.
 * Safe to call on every startup.
 */
export async function ensureHeaders(
  sheetName: string,
  headers: string[]
): Promise<void> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!A1:A1`,
  });

  const hasHeaders = response.data.values?.[0]?.[0] === headers[0];
  if (!hasHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}

// ---- Utilities ---------------------------------------------

/** Convert column count to letter (1→A, 26→Z, 27→AA) */
function columnLetter(count: number): string {
  let result = "";
  let n = count;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Find the 1-based row index of a row by its ID (column 0). Returns -1 if not found. */
export async function findRowIndexById(
  sheetName: string,
  id: string
): Promise<number> {
  const rows = await readRows(sheetName);
  const dataIndex = rows.findIndex((row) => row[0] === id);
  if (dataIndex === -1) return -1;
  return dataIndex + 2; // +1 for header row, +1 for 1-based index
}
