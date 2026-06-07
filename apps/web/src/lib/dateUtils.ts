export function formatIST(dateInput: string | Date | number, includeTime: boolean = true): string {
  if (!dateInput) return "-";
  try {
    let dStr = dateInput;
    if (typeof dStr === 'string') {
      if (!dStr.includes('T') && dStr.includes(' ')) {
        dStr = dStr.replace(' ', 'T');
      }
      if (!dStr.endsWith('Z') && !dStr.includes('+') && !dStr.match(/-\d{2}:\d{2}$/)) {
        dStr += 'Z';
      }
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return "-";
    
    const formatted = d.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      } : {})
    });
    
    // Optional: make it all uppercase to match existing styles like "JUN 5, 2026 6:09 AM"
    return formatted.toUpperCase().replace(",", "");
  } catch (e) {
    return String(dateInput);
  }
}
