firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

serviceForm.onsubmit = saveService;

function formatDateBR(date) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

async function saveService(e) {
  e.preventDefault();

  const id = serviceId.value;

  const data = {
    userId: auth.currentUser.uid,
    client: clientName.value,
    address: clientAddress.value,
    date: serviceDate.value,
    time: serviceTime.value,
    whatsapp: clientWhatsapp.value.replace(/\D/g, ''),
    status: 'agendado'
  };

  if (id) {
    await db.collection('services').doc(id).update(data);
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

async function loadServices() {
  servicesList.innerHTML = '';
  loadingServices.style.display = 'block';

  const snap = await db
    .collection('services')
    .where('userId', '==', auth.currentUser.uid)
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

window.editService = function(id, s) {
  serviceId.value = id;
  clientName.value = s.client;
  clientAddress.value = s.address;
  serviceDate.value = s.date;
  serviceTime.value = s.time;
  clientWhatsapp.value = s.whatsapp;
  formTitle.textContent = 'Editar Agendamento';
};
