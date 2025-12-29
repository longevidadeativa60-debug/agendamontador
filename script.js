const firebaseConfig = {
  apiKey: "AIzaSyDO7ZVtrHv9pBZ4VK18amIEW4v9xrXCVCY",
  authDomain: "agenda-montador.firebaseapp.com",
  projectId: "agenda-montador",
  storageBucket: "agenda-montador.firebasestorage.app",
  messagingSenderId: "398016304826",
  appId: "1:398016304826:web:d83985591a713698cf5483"
};

// 🔥 FIREBASE
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 🔥 ESTADO
let currentUser = null;
let allServices = [];
let currentDate = new Date();

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

// Campos do formulário
const serviceId = document.getElementById('serviceId');
const clientName = document.getElementById('clientName');
const clientAddress = document.getElementById('clientAddress');
const serviceDate = document.getElementById('serviceDate');
const serviceTime = document.getElementById('serviceTime');
const clientWhatsapp = document.getElementById('clientWhatsapp');
const serviceStatus = document.getElementById('serviceStatus');
const serviceValue = document.getElementById('serviceValue');
const serviceNotes = document.getElementById('serviceNotes');
const servicePhotos = document.getElementById('servicePhotos');

// 🔥 NAVEGAÇÃO
function switchScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// 🔥 AUTH LISTENER
auth.onAuthStateChanged(async user => {
  console.log('🔐 Auth state changed:', user ? user.email : 'logged out');
  
  if (user) {
    currentUser = user;
    
    try {
      // Busca dados do usuário no Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      
      console.log('👤 User data:', userData);
      
      // Se não existir documento, cria um básico
      if (!userData) {
        console.log('📝 Criando documento de usuário...');
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          trialEndDate: firebase.firestore.Timestamp.fromDate(trialEndDate),
          isPremium: false,
          isTrialActive: true
        });
      }
      
      // Verifica status do trial/premium
      if (userData) {
        const now = new Date();
        const trialEnd = userData.trialEndDate?.toDate();
        
        if (!userData.isPremium && trialEnd && now > trialEnd) {
          // Trial expirado
          alert('⚠️ Seu período de teste expirou! Assine para continuar usando.');
          auth.signOut();
          return;
        }
        
        // Mostra dias restantes do trial
        if (!userData.isPremium && trialEnd) {
          const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 3) {
            showTrialWarning(daysLeft);
          }
        }
      }
      
      const displayName = userData?.nickname || user.email.split('@')[0];
      
      userNameDisplay.textContent = displayName;
      userNameDisplay.style.cursor = 'pointer';
      userNameDisplay.title = 'Clique para editar';
      
      btnLogout.style.display = 'block';
      switchScreen('dashboard');
      loadServices();
      updateDashboard();
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      alert('Erro ao carregar dados: ' + error.message);
      // NÃO faz logout em caso de erro
    }
  } else {
    currentUser = null;
    btnLogout.style.display = 'none';
    switchScreen('login');
  }
});

// 🔥 AVISO DE TRIAL
function showTrialWarning(daysLeft) {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'trial-warning';
  warningDiv.innerHTML = `
    ⚠️ Restam apenas ${daysLeft} dias do seu teste grátis! 
    <a href="#" onclick="window.open('https://pay.kiwify.com.br/SEU_LINK', '_blank')">
      Assinar agora
    </a>
  `;
  
  const dashboard = document.getElementById('dashboardScreen');
  dashboard.insertBefore(warningDiv, dashboard.firstChild);
}

// 🔥 EDITAR APELIDO
userNameDisplay.addEventListener('click', async () => {
  const currentNickname = userNameDisplay.textContent;
  const newNickname = prompt('Digite seu novo apelido:', currentNickname);
  
  if (newNickname && newNickname.trim() && newNickname !== currentNickname) {
    try {
      await db.collection('users').doc(currentUser.uid).set({
        nickname: newNickname.trim(),
        email: currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      userNameDisplay.textContent = newNickname.trim();
      alert('Apelido atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar apelido: ' + error.message);
    }
  }
});

// 🔥 LOGIN
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const btn = e.target.querySelector('button');
  
  try {
    btn.textContent = 'Entrando...';
    btn.disabled = true;
    
    console.log('🔑 Tentando login...');
    await auth.signInWithEmailAndPassword(
      loginEmail.value,
      loginPassword.value
    );
    console.log('✅ Login bem-sucedido!');
    
  } catch (error) {
    console.error('❌ Erro no login:', error);
    btn.textContent = 'Entrar';
    btn.disabled = false;
    
    if (error.code === 'auth/user-not-found') {
      alert('❌ Usuário não encontrado. Verifique o email ou cadastre-se.');
    } else if (error.code === 'auth/wrong-password') {
      alert('❌ Senha incorreta. Tente novamente.');
    } else if (error.code === 'auth/invalid-email') {
      alert('❌ Email inválido.');
    } else {
      alert('❌ Erro ao fazer login: ' + error.message);
    }
  }
});

// 🔥 CADASTRO
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const btn = e.target.querySelector('button');
  
  if (regPassword.value.length < 6) {
    alert('❌ A senha deve ter no mínimo 6 caracteres!');
    return;
  }
  
  try {
    btn.textContent = 'Cadastrando...';
    btn.disabled = true;
    
    console.log('📝 Criando conta...');
    const userCredential = await auth.createUserWithEmailAndPassword(
      regEmail.value,
      regPassword.value
    );
    
    // Cria documento do usuário com trial de 14 dias
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    await db.collection('users').doc(userCredential.user.uid).set({
      email: regEmail.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      trialEndDate: firebase.firestore.Timestamp.fromDate(trialEndDate),
      isPremium: false,
      isTrialActive: true
    });
    
    console.log('✅ Cadastro realizado!');
    alert('🎉 Cadastro realizado! Você tem 14 dias de teste grátis!');
    
  } catch (error) {
    console.error('❌ Erro no cadastro:', error);
    btn.textContent = 'Cadastrar';
    btn.disabled = false;
    
    if (error.code === 'auth/email-already-in-use') {
      alert('❌ Este email já está cadastrado. Faça login.');
    } else if (error.code === 'auth/invalid-email') {
      alert('❌ Email inválido.');
    } else if (error.code === 'auth/weak-password') {
      alert('❌ Senha muito fraca. Use no mínimo 6 caracteres.');
    } else {
      alert('❌ Erro ao cadastrar: ' + error.message);
    }
  }
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

// 🔥 UTILS
function formatDateBR(date) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

// 🔥 DASHBOARD FINANCEIRO
async function updateDashboard() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const firstDayStr = formatDateToISO(firstDay);
  const lastDayStr = formatDateToISO(lastDay);
  
  const monthServices = allServices.filter(s => 
    s.date >= firstDayStr && s.date <= lastDayStr
  );
  
  const totalMonth = monthServices.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  const totalPending = monthServices
    .filter(s => s.status !== 'concluido')
    .reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  const totalReceived = monthServices
    .filter(s => s.status === 'concluido')
    .reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  
  document.getElementById('totalMonth').textContent = formatCurrency(totalMonth);
  document.getElementById('totalPending').textContent = formatCurrency(totalPending);
  document.getElementById('totalReceived').textContent = formatCurrency(totalReceived);
  document.getElementById('totalServices').textContent = monthServices.length;
}

// 🔥 UPLOAD DE FOTOS
async function handlePhotoUpload(files, serviceDocId) {
  const photoUrls = [];
  
  for (let file of files) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Foto muito grande. Máximo 5MB.');
      continue;
    }
    
    const storageRef = storage.ref(`services/${serviceDocId}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    photoUrls.push(url);
  }
  
  return photoUrls;
}

// 🔥 SALVAR / EDITAR
serviceForm.addEventListener('submit', saveService);

async function saveService(e) {
  e.preventDefault();
  
  try {
    const data = {
      userId: currentUser.uid,
      client: clientName.value,
      address: clientAddress.value,
      date: serviceDate.value,
      time: serviceTime.value,
      whatsapp: clientWhatsapp.value.replace(/\D/g, ''),
      status: serviceStatus.value,
      value: parseFloat(serviceValue.value) || 0,
      notes: serviceNotes.value || '',
      photos: []
    };

    let docId = serviceId.value;

    if (docId) {
      // Atualizar
      const existingDoc = await db.collection('services').doc(docId).get();
      data.photos = existingDoc.data().photos || [];
      
      if (servicePhotos.files.length > 0) {
        const newPhotos = await handlePhotoUpload(servicePhotos.files, docId);
        data.photos = [...data.photos, ...newPhotos];
      }
      
      await db.collection('services').doc(docId).update(data);
    } else {
      // Criar novo
      const docRef = await db.collection('services').add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      docId = docRef.id;
      
      if (servicePhotos.files.length > 0) {
        const newPhotos = await handlePhotoUpload(servicePhotos.files, docId);
        await db.collection('services').doc(docId).update({ photos: newPhotos });
      }
    }

    serviceForm.reset();
    serviceId.value = '';
    serviceStatus.value = 'agendado';
    formTitle.textContent = 'Novo Agendamento';
    
    loadServices();
    alert('Agendamento salvo com sucesso!');
  } catch (error) {
    console.error('Erro detalhado:', error);
    alert('Erro ao salvar agendamento: ' + error.message);
  }
}

// 🔥 RENDERIZAR CALENDÁRIO
function renderCalendar() {
  const calendarContainer = document.getElementById('calendarContainer');
  const monthYearDisplay = document.getElementById('monthYearDisplay');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  calendarContainer.innerHTML = '';
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  weekDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendarContainer.appendChild(dayHeader);
  });
  
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarContainer.appendChild(emptyDay);
  }
  
  const today = new Date();
  const todayStr = formatDateToISO(today);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dateStr = formatDateToISO(dayDate);
    
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    if (dateStr === todayStr) {
      dayCell.classList.add('today');
    }
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    const servicesOnDay = allServices.filter(s => s.date === dateStr);
    if (servicesOnDay.length > 0) {
      const indicators = document.createElement('div');
      indicators.className = 'status-indicators';
      
      const statusSet = new Set(servicesOnDay.map(s => s.status));
      statusSet.forEach(status => {
        const dot = document.createElement('span');
        dot.className = `status-dot status-${status}`;
        indicators.appendChild(dot);
      });
      
      dayCell.appendChild(indicators);
      dayCell.classList.add('has-services');
    }
    
    dayCell.addEventListener('click', () => {
      document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
      dayCell.classList.add('selected');
      showServicesForDate(dateStr);
    });
    
    calendarContainer.appendChild(dayCell);
  }
}

// 🔥 NAVEGAÇÃO DO CALENDÁRIO
document.getElementById('prevMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  currentDate = new Date();
  renderCalendar();
  showServicesForDate(formatDateToISO(currentDate));
});

// 🔥 WHATSAPP
async function sendWhatsApp(service, type = 'confirmation') {
  const phone = service.whatsapp;
  
  // Busca o apelido do usuário
  const userDoc = await db.collection('users').doc(currentUser.uid).get();
  const userData = userDoc.data();
  const senderName = userData?.nickname || currentUser.email.split('@')[0];
  
  let message = '';
  
  if (type === 'confirmation') {
    message = `Olá ${service.client}! 👋

Confirmo sua montagem agendada para:
📅 ${formatDateBR(service.date)} às ${service.time}
📍 ${service.address}

Qualquer dúvida, estou à disposição!

Atenciosamente,
${senderName}`;
  } else if (type === 'reminder') {
    message = `Olá ${service.client}! 👋

Lembrete: Amanhã temos sua montagem agendada:
📅 ${formatDateBR(service.date)} às ${service.time}
📍 ${service.address}

Nos vemos em breve!

${senderName}`;
  } else if (type === 'conclusion') {
    message = `Olá ${service.client}! 👋

Serviço concluído com sucesso! 🎉

Foi um prazer atendê-lo(a)!

Se puder avaliar nosso trabalho, ficaria muito grato! ⭐⭐⭐⭐⭐

${senderName}`;
  }
  
  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// 🔥 GOOGLE MAPS / WAZE
function openMaps(address, type = 'google') {
  const encoded = encodeURIComponent(address);
  let url = '';
  
  if (type === 'google') {
    url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  } else if (type === 'waze') {
    url = `https://waze.com/ul?q=${encoded}&navigate=yes`;
  }
  
  window.open(url, '_blank');
}

// 🔥 EXPORTAR PDF
function exportToPDF() {
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  alert(`Função de exportação PDF será implementada em breve!
  
Por enquanto, você pode:
1. Tirar print da tela (Ctrl + P)
2. Salvar como PDF

Relatório: ${monthName}`);
}

document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);

// 🔥 MOSTRAR AGENDAMENTOS DO DIA
function showServicesForDate(dateStr) {
  servicesList.innerHTML = '';
  emptyServices.style.display = 'none';
  
  const servicesOnDay = allServices.filter(s => s.date === dateStr);
  
  if (servicesOnDay.length === 0) {
    emptyServices.textContent = `Nenhum agendamento em ${formatDateBR(dateStr)}`;
    emptyServices.style.display = 'block';
    return;
  }
  
  servicesOnDay.sort((a, b) => a.time.localeCompare(b.time));
  
  servicesOnDay.forEach(s => {
    const div = document.createElement('div');
    div.className = `service-item status-${s.status}`;

    const photosHtml = s.photos && s.photos.length > 0 ? 
      `<div class="service-photos">
        ${s.photos.map(url => `<img src="${url}" class="service-photo-thumb" onclick="window.open('${url}')">`).join('')}
      </div>` : '';

    div.innerHTML = `
      <div class="service-header-row">
        <strong class="service-client-name">${s.client}</strong>
        <span class="service-value">${formatCurrency(s.value)}</span>
      </div>
      
      <div class="service-info">
        📍 ${s.address}<br>
        🗓 ${formatDateBR(s.date)} ⏰ ${s.time}<br>
        📱 ${formatPhone(s.whatsapp)}<br>
        ${s.notes ? `📝 ${s.notes}<br>` : ''}
        Status: <span class="status-text status-${s.status}">${s.status.toUpperCase()}</span>
      </div>

      ${photosHtml}

      <div class="service-actions">
        <button class="btn-action btn-whatsapp" onclick='sendWhatsApp(${JSON.stringify(s).replace(/'/g, "\\'")}, "confirmation")'>
          💬 WhatsApp
        </button>
        <button class="btn-action btn-maps" onclick='openMaps("${s.address}", "google")'>
          🗺️ Maps
        </button>
        <button class="btn-action btn-waze" onclick='openMaps("${s.address}", "waze")'>
          🚗 Waze
        </button>
      </div>

      <div class="service-actions">
        <button class="btn-action btn-edit" onclick="editService('${s.id}', ${JSON.stringify(s).replace(/"/g,'&quot;')})">
          ✏️ Editar
        </button>
        <button class="btn-action btn-delete" onclick="deleteService('${s.id}')">
          🗑️ Excluir
        </button>
        ${s.status !== 'concluido' ? 
          `<button class="btn-action btn-finish" onclick="finishService('${s.id}')">✓ Concluir</button>` : ''}
      </div>
    `;

    servicesList.appendChild(div);
  });
}

// 🔥 LISTAR
async function loadServices() {
  try {
    loadingServices.style.display = 'block';

    const snap = await db
      .collection('services')
      .where('userId', '==', currentUser.uid)
      .orderBy('date')
      .orderBy('time')
      .get();

    loadingServices.style.display = 'none';

    allServices = [];
    snap.forEach(doc => {
      allServices.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderCalendar();
    updateDashboard();
    
    const todayStr = formatDateToISO(new Date());
    showServicesForDate(todayStr);

  } catch (error) {
    loadingServices.style.display = 'none';
    console.error('Erro ao carregar:', error);
    
    // Se for erro de permissão, apenas mostra sem dados
    if (error.code === 'permission-denied') {
      console.log('⚠️ Sem permissão para carregar agendamentos ainda');
      allServices = [];
      renderCalendar();
      updateDashboard();
    } else {
      alert('Erro ao carregar agendamentos: ' + error.message);
    }
  }
}

// 🔥 EDITAR
window.editService = function(id, s) {
  serviceId.value = id;
  clientName.value = s.client;
  clientAddress.value = s.address;
  serviceDate.value = s.date;
  serviceTime.value = s.time;
  clientWhatsapp.value = s.whatsapp;
  serviceStatus.value = s.status;
  serviceValue.value = s.value || '';
  serviceNotes.value = s.notes || '';
  formTitle.textContent = 'Editar Agendamento';

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 🔥 EXCLUIR
window.deleteService = async function(id) {
  if (!confirm('Deseja realmente excluir este agendamento?')) return;
  try {
    await db.collection('services').doc(id).delete();
    loadServices();
    alert('Agendamento excluído!');
  } catch (error) {
    alert('Erro ao excluir: ' + error.message);
  }
};

// 🔥 CONCLUIR
window.finishService = async function(id) {
  if (!confirm('Marcar como concluído?')) return;
  try {
    await db.collection('services').doc(id).update({ status: 'concluido' });
    
    const service = allServices.find(s => s.id === id);
    if (service && confirm('Enviar mensagem de agradecimento ao cliente?')) {
      sendWhatsApp(service, 'conclusion');
    }
    
    loadServices();
    alert('Agendamento concluído!');
  } catch (error) {
    alert('Erro ao concluir: ' + error.message);
  }
};

// Expor funções globais
window.sendWhatsApp = sendWhatsApp;
window.openMaps = openMaps;