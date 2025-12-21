// 🔥 FIREBASE
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// 🔥 ESTADO
let currentUser = null;

// 🔥 SELETORES
const screens = {
  login: document.getElementById('loginScreen'),
  register: document.getElementById('registerScreen'),
  dashboard: document.getElementById('dashboardScreen')
};

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const serviceForm = document.getElementById('serviceForm');

const btnLogout = document.getElementById('btnLogout');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');

const servicesList = document.getElementById('servicesList');
const emptyServices = document.getElementById('emptyServices');
const loadingServices = document.getElementById('loadingServices');

const userNameDisplay = document.getElementById('userNameDisplay');
const formTitle = document.getElementById('formTitle');

// campos do formulário
const serviceId = document.getElementById('serviceId');
const clientName = document.getElementById('clientName');
const clientAddress = document.getElementById('clientAddress');
const serviceDate = document.getElementById('serviceDate');
const serviceTime = document.getElementById('serviceTime');
const clientWhatsapp = document.getElementById('clientWhatsapp');

// 🔥 NAVEGAÇÃO
function switchScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// 🔥 AUTH LISTENER (OBRIGATÓRIO)
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.email.split('@')[0];
    btnLogout.style.display = 'block';
    switchScreen('dashboard');
    loadServices();
  } else {
    currentUser = null;
    btnLogout.style.display = 'none';
    switchScreen('login');
  }
});

// 🔥 LOGIN
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  await auth.signInWithEmailAndPassword(
    loginEmail.value,
    loginPassword.value
  );
});

// 🔥 CADASTRO
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  await auth.createUserWithEmailAndPassword(
    regEmail.value,
    regPassword.value
  );
});

// 🔥 LOGOUT
btnLogout.addEventListener('click', () => auth.signOut());

// 🔥 LINKS
linkToRegister.onclick = e => {
  e.preventDefault();
  switchScreen('register');
};

linkToLogin.onclick = e => {
  e.preventDefault();
  switchScreen('login');
};

// 🔥 UTIL
function formatDateBR(date) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

// 🔥 SALVAR / EDITAR
serviceForm.addEventListener('submit', saveService);

async function saveService(e) {
  e.preventDefault();

  const data = {
    userId: currentUser.uid,
    client: clientName.value,
    address: clientAddress.value,
    date: serviceDate.value,
    time: serviceTime.value,
    whatsapp: clientWhatsapp.value.replace(/\D/g, ''),
    status: 'agendado'
  };

  if (serviceId.value) {
    await db.collection('services').doc(serviceId.value).update(data);
  } else {
    await db.collection('services').add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  serviceForm.reset();
  serviceId.value = '';
  formTitle.textContent = 'Novo Agendamento';
  loadServices();
}

// 🔥 LISTAR
async function loadServices() {
  servicesList.innerHTML = '';
  emptyServices.style.display = 'none';
  loadingServices.style.display = 'block';

  const snap = await db
    .collection('services')
    .where('userId', '==', currentUser.uid)
    .orderBy('date')
    .orderBy('time')
    .get();

  loadingServices.style.display = 'none';

  if (snap.empty) {
    emptyServices.style.display = 'block';
    return;
  }

  snap.forEach(doc => {
    const s = doc.data();

    const div = document.createElement('div');
    div.className = 'service-item';

    div.innerHTML = `
      <strong>${s.client}</strong><br>
      📍 ${s.address}<br>
      🗓 ${formatDateBR(s.date)} ⏰ ${s.time}<br><br>

      <button onclick="editService('${doc.id}', ${JSON.stringify(s).replace(/"/g,'&quot;')})">✏️ Editar</button>
      <button onclick="finishService('${doc.id}')">✔ Concluir</button>
    `;

    servicesList.appendChild(div);
  });
}

// 🔥 EDITAR
window.editService = function(id, s) {
  serviceId.value = id;
  clientName.value = s.client;
  clientAddress.value = s.address;
  serviceDate.value = s.date;
  serviceTime.value = s.time;
  clientWhatsapp.value = s.whatsapp;
  formTitle.textContent = 'Editar Agendamento';
};

// 🔥 CONCLUIR
window.finishService = async function(id) {
  if (!confirm('Marcar como concluído?')) return;
  await db.collection('services').doc(id).update({ status: 'concluido' });
  loadServices();
};
