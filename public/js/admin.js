document.addEventListener('DOMContentLoaded', () => {
  const chartCanvas = document.getElementById('adminDonationChart');
  if (chartCanvas && window.Chart) {
    const dataset = JSON.parse(chartCanvas.dataset.chart || '[]');
    const labels = dataset.map((item) => item.period);
    const values = dataset.map((item) => Number(item.total));

    new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Monthly donations (₹)',
            data: values,
            backgroundColor: '#1d3557'
          }
        ]
      },
      options: {
        responsive: true,
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

  document.querySelectorAll('[data-toggle="drawer"]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const target = document.querySelector(trigger.getAttribute('data-target'));
      if (target) {
        target.classList.add('active');
      }
    });
  });

  document.querySelectorAll('[data-dismiss="drawer"]').forEach((closer) => {
    closer.addEventListener('click', () => {
      const drawer = closer.closest('.drawer');
      if (drawer) {
        drawer.classList.remove('active');
      }
    });
  });

  document.querySelectorAll('.drawer').forEach((drawer) => {
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) {
        drawer.classList.remove('active');
      }
    });
  });
});
