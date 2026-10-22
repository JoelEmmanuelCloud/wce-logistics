import { describe, expect, it } from "vitest";
import { csvCell, koboToNaira, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes values with commas, quotes and line breaks", () => {
    expect(csvCell("Ade Haulage, Ltd")).toBe('"Ade Haulage, Ltd"');
    expect(csvCell('The "big" truck')).toBe('"The ""big"" truck"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("plain")).toBe("plain");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+2348031234567")).toBe("\"'+2348031234567\"");
    expect(csvCell("-1")).toBe("\"'-1\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });

  it("writes numbers and empty values as is", () => {
    expect(csvCell(-1200.5)).toBe("-1200.5");
    expect(csvCell(null)).toBe("");
    expect(koboToNaira(1_080_000)).toBe(10_800);
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});
