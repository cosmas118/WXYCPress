function uploadCSV() {
  const input = document.getElementById('csv-file');
  const file = input.files[0];

  if (!file) {
    showToast('Please select a CSV file first', true);
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async (results) => {
      try {
        const rows = results.data;

        const records = rows
          .filter(r =>
            r &&
            r.artist &&
            r.artist.trim() !== ''
          )
          .map(r => ({
            date: r.date || '',
            venue: r.venue || '',
            artist: r.artist || '',
            descp: r.desc || '',
            genres: r.genres
              ? r.genres
                  .split('|')
                  .map(g => g.trim())
                  .filter(Boolean)
              : [],
            link: r.link || ''
          }));

        if (records.length === 0) {
          document.getElementById('upload-status').textContent =
            'No valid rows found.';
          return;
        }

        const { error } = await sb
          .from('concerts')
          .insert(records);

        if (error) {
          console.error(error);

          document.getElementById('upload-status').textContent =
            error.message;

          showToast(error.message, true);
          return;
        }

        document.getElementById('upload-status').textContent =
          `Uploaded ${records.length} concerts successfully.`;

        showToast(`Uploaded ${records.length} concerts`);

        await loadConcerts();

        if (
          document.getElementById('admin-panel') &&
          document.getElementById('admin-panel').classList.contains('open')
        ) {
          await loadAdminConcerts();
        }

      } catch (err) {
        console.error(err);

        document.getElementById('upload-status').textContent =
          err.message;

        showToast('Upload failed', true);
      }
    },

    error: (err) => {
      console.error(err);

      document.getElementById('upload-status').textContent =
        err.message;

      showToast('CSV parse error', true);
    }
  });
}
