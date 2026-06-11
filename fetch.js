fetch('https://codeforces.com/profile/tourist')
  .then(r => r.text())
  .then(t => {
    const start = t.indexOf('<div class="main-info');
    console.log(t.substring(start, start + 2000));
  });
