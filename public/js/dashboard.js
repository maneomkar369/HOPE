document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('donationTrendChart');
  if (canvas && window.Chart) {
    const dataset = JSON.parse(canvas.dataset.chart || '[]');
    const labels = dataset.map((item) => item.period);
    const values = dataset.map((item) => Number(item.total));

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Donations (₹)',
            data: values,
            borderColor: '#0b7285',
            backgroundColor: 'rgba(11, 114, 133, 0.15)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
});
