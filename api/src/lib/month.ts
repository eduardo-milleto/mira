// limites do mes em UTC a partir de uma chave "YYYY-MM" (ou o mes atual quando ausente
// ou invalida). datas de calendario (@db.Date) sao gravadas como meia-noite UTC, entao
// comparar em UTC mantem a soma do mes consistente independente do fuso do servidor.
export function monthRange(monthKey: string | undefined, now: Date): { start: Date; end: Date } {
  const valid = !!monthKey && /^\d{4}-\d{2}$/.test(monthKey);
  const year = valid ? Number(monthKey.slice(0, 4)) : now.getUTCFullYear();
  const month = valid ? Number(monthKey.slice(5, 7)) - 1 : now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}
