/** Download a local JSON copy; no server request is made. */
export function downloadJson(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  try {
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); }
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
