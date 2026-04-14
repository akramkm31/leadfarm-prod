export function downloadCSV(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  filename: string
) {
  if (!data.length) return;

  const header = columns.map(c => `"${c.label}"`).join(";");
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val == null) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(";")
  );

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
