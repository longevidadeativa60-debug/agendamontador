// 🔥 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDO7ZVtrHv9pBZ4VK18amIEW4v9xrXCVCY",
  authDomain: "agenda-montador.firebaseapp.com",
  projectId: "agenda-montador",
  storageBucket: "agenda-montador.appspot.com",
  messagingSenderId: "398016304826",
  appId: "1:398016304826:web:d83985591a713698cf5483"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ELEMENTOS
const screens = {
  login: loginScreen,
  register: registerScreen,
  dashboard: dashboardScreen
};

const btnLogout = document.getElementById('btnLogout');
const userNameDisplay = document.getElementById('userNameDisplay');
const servicesList = document.getElementById('servicesList');
const emptyServices = document.getElementById('emptyServices');
const loadingServices = document.getElementById('loadingServices');

// EVENTOS
loginForm.onsubmit = login;
registerForm.onsubmit = register;
serviceForm.onsubmit = saveService;
btnLogout.onclick = logout;
linkToRegister.onclick = () => showScreen('register');
linkToLogin.onclick = () => showScreen('login');

// AUTH STATE
auth.onAuthStateChanged(user => {
  if (user) {
    userNameDisplay.textContent = user.email.split('@')[0];
    showScreen('dashboard');
    loadServices();
  } else {
    showScreen('login');
  }
});

// FUNÇÕES
async function login(e) {
  e.preventDefault();
  await auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value);
}

async function register(e) {
  e.preventDefault();
  await auth.createUserWithEmailAndPassword(regEmail.value, regPassword.value);
}

async function logout() {
  await auth.signOut();
}

async function saveService(e) {
  e.preventDefault();

  await db.collection('services').add({
    userId: auth.currentUser.uid,
    client: clientName.value,
    address: clientAddress.value,
    date: serviceDate.value,
    time: serviceTime.value,
    whatsapp: clientWhatsapp.value.replace(/\D/g, ''),
    status: 'agendado',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  serviceForm.reset();
  loadServices();
}

async function loadServices() {
  servicesList.innerHTML = '';
  loadingServices.style.display = 'block';
  emptyServices.style.display = 'none';

  try {
    const snapshot = await db
      .collection('services')
      .where('userId', '==', auth.currentUser.uid)
      .get();

    loadingServices.style.display = 'none';

    if (snapshot.empty) {
      emptyServices.style.display = 'block';
      return;
    }

    snapshot.forEach(doc => {
      const s = doc.data();
      const div = document.createElement('div');
      div.className = 'service-item';

      const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`;

      div.innerHTML = `
        <strong>${s.client}</strong><br>

        📍 <a href="${mapsLink}" target="_blank">
          ${s.address}
        </a><br>

        🗓 ${s.date} ⏰ ${s.time}<br><br>

        <a href="https://wa.me/55${s.whatsapp}" target="_blank">📲 WhatsApp</a>
        <button onclick="finishService('${doc.id}')">✔ Concluir</button>
      `;

      servicesList.appendChild(div);
    });

  } catch (err) {
    loadingServices.style.display = 'none';
    console.error('Erro ao carregar serviços:', err);
    alert('Erro ao carregar serviços. Veja o console.');
  }
}

window.finishService = async function(id) {
  await db.collection('services').doc(id).update({ status: 'concluido' });
  loadServices();
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  btnLogout.style.display = name === 'dashboard' ? 'block' : 'none';
}
