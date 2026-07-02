import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, toCsv } from "../src/csv.mjs";

test("parseCsv normaliza cabecalhos e valores", () => {
  const rows = parseCsv("Nome Empresa,Site\nACME,https://example.com\n");

  assert.deepEqual(rows, [{ nome_empresa: "ACME", site: "https://example.com" }]);
});

test("toCsv escapa aspas e virgulas", () => {
  const csv = toCsv([{ empresa: 'ACME, "Teste"', score: 90 }]);

  assert.match(csv, /"ACME, ""Teste"""/);
});
