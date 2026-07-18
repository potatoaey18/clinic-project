const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const themeToggle = document.querySelector('.theme-toggle');
const form = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.3 });

sections.forEach(section => observer.observe(section));

const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
};

themeToggle.addEventListener('click', toggleTheme);

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.style.display = 'none';
  formMessage.className = 'form-message';

  const formData = new FormData(form);
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      formMessage.textContent = 'Thank you! Your message has been sent.';
      formMessage.className = 'form-message success';
      formMessage.style.display = 'block';
      form.reset();
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    formMessage.textContent = 'Oops! There was an error sending your message.';
    formMessage.className = 'form-message error';
    formMessage.style.display = 'block';
  }
});
