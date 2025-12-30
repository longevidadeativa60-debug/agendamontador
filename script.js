// 🔥 FIREBASE CONFIG
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
const forgotPasswordLink = document.getElementById('forgotPassword');

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

// 🔥 LOGOUT
btnLogout.addEventListener('click', async () => {
  try {
    await auth.signOut();
    alert('Você saiu com sucesso!');
  } catch (error) {
    alert('Erro ao sair: ' + error.message);
  }
});

// 🔥 REGISTRO
linkToRegister.addEventListener('click', e => {
  e.preventDefault();
  switchScreen('register');
});

linkToLogin.addEventListener('click', e => {
  e.preventDefault();
  switchScreen('login');
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const btn = e.target.querySelector('button');
  
  try {
    btn.textContent = 'Cadastrando...';
    btn.disabled = true;
    
    console.log('📝 Criando conta...');
    const userCredential = await auth.createUserWithEmailAndPassword(
      regEmail.value,
      regPassword.value
    );
    
    const user = userCredential.user;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    // Cria documento do usuário
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      trialEndDate: firebase.firestore.Timestamp.fromDate(trialEndDate),
      isPremium: false,
      isTrialActive: true
    });
    
    console.log('✅ Conta criada com sucesso!');
    alert('✅ Conta criada! Você tem 14 dias de teste grátis.');
    
  } catch (error) {
    console.error('❌ Erro no registro:', error);
    btn.textContent = 'Cadastrar';
    btn.disabled = false;
    
    if (error.code === 'auth/email-already-in-use') {
      alert('❌ Este email já está registrado.');
    } else if (error.code === 'auth/weak-password') {
      alert('❌ Senha muito fraca. Use pelo menos 6 caracteres.');
    } else {
      alert('❌ Erro ao criar conta: ' + error.message);
    }
  }
});

// 🔥 ESQUECI SENHA
forgotPasswordLink.addEventListener('click', async e => {
  e.preventDefault();
  const email = prompt('Digite seu email para recuperar a senha:');
  if (email) {
    try {
      await auth.sendPasswordResetEmail(email);
      alert('✅ Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    }
  }
});

// 🔥 FUNÇÕES AUXILIARES
function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
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
  const totalPending = monthServices.filter(s => s.status !== 'concluido').reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  const totalReceived = monthServices.filter(s => s.status === 'concluido').reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  const totalServices = monthServices.length;
  
  document.getElementById('totalMonth').textContent = formatCurrency(totalMonth);
  document.getElementById('totalPending').textContent = formatCurrency(totalPending);
  document.getElementById('totalReceived').textContent = formatCurrency(totalReceived);
  document.getElementById('totalServices').textContent = totalServices;
}

// 🔥 CALENDÁRIO
const calendarContainer = document.getElementById('calendarContainer');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

function renderCalendar() {
  calendarContainer.innerHTML = '';
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  monthYearDisplay.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado
  
  // Cabeçalho dos dias da semana
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  daysOfWeek.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendarContainer.appendChild(dayHeader);
  });
  
  // Espaços vazios antes do primeiro dia
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarContainer.appendChild(emptyDay);
  }
  
  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateToISO(date);
    const servicesOnDay = allServices.filter(s => s.date === dateStr);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    dayElement.dataset.date = dateStr;
    
    if (dateStr === formatDateToISO(new Date())) {
      dayElement.classList.add('today');
    }
    
    if (servicesOnDay.length > 0) {
      dayElement.classList.add('has-services');
      
      // Adiciona bolinhas de status
      const statusContainer = document.createElement('div');
      statusContainer.className = 'status-container';
      
      const statuses = servicesOnDay.map(s => s.status);
      const uniqueStatuses = [...new Set(statuses)];
      
      uniqueStatuses.forEach(status => {
        const dot = document.createElement('span');
        dot.className = `status-dot status-${status}`;
        statusContainer.appendChild(dot);
      });
      
      dayElement.appendChild(statusContainer);
    }
    
    dayElement.addEventListener('click', () => {
      selectDay(dateStr);
    });
    
    calendarContainer.appendChild(dayElement);
  }
  
  // Seleciona o dia atual (ou o dia que estava selecionado)
  const selectedDayElement = calendarContainer.querySelector(`[data-date="${formatDateToISO(currentDate)}"]`);
  if (selectedDayElement) {
    selectedDayElement.classList.add('selected');
    loadServicesForDay(formatDateToISO(currentDate));
  } else {
    // Se o dia atual não estiver no mês, seleciona o primeiro dia do mês
    selectDay(formatDateToISO(firstDayOfMonth));
  }
}

prevMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

todayBtn.addEventListener('click', () => {
  currentDate = new Date();
  renderCalendar();
});

function selectDay(dateStr) {
  // Remove seleção anterior
  calendarContainer.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected');
  });
  
  // Adiciona nova seleção
  const selectedDayElement = calendarContainer.querySelector(`[data-date="${dateStr}"]`);
  if (selectedDayElement) {
    selectedDayElement.classList.add('selected');
    currentDate = new Date(dateStr);
    loadServicesForDay(dateStr);
  }
}

// 🔥 SERVIÇOS (ATUALIZADO PARA FUNCIONAR COM O SEU ÍNDICE)
async function loadServices() {
  if (!currentUser) return;
  
  loadingServices.style.display = 'block';
  
  try {
    const snapshot = await db.collection('services')
      .where('userId', '==', currentUser.uid)
      .orderBy('date', 'desc')
      .orderBy('time', 'desc') // Adicionado para bater com o seu índice composto
      .get();
      
    allServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderCalendar();
    updateDashboard();
    
  } catch (error) {
    console.error('❌ Erro ao carregar serviços:', error);
    alert('Erro ao carregar serviços: ' + error.message);
  } finally {
    loadingServices.style.display = 'none';
  }
}

function loadServicesForDay(dateStr) {
  const services = allServices.filter(s => s.date === dateStr);
  
  servicesList.innerHTML = '';
  
  if (services.length === 0) {
    emptyServices.style.display = 'block';
    return;
  }
  
  emptyServices.style.display = 'none';
  
  services.forEach(s => {
    const serviceElement = document.createElement('div');
    serviceElement.className = `service-item status-${s.status}`;
    serviceElement.innerHTML = `
      <div class="service-header-row">
        <span class="service-client-name">${s.clientName}</span>
        <span class="service-value">${formatCurrency(parseFloat(s.value) || 0)}</span>
      </div>
      <div class="service-info">
        <p><strong>⏰ Horário:</strong> ${s.time}</p>
        <p><strong>📍 Endereço:</strong> ${s.clientAddress}</p>
        <p><strong>📱 WhatsApp:</strong> <a href="https://wa.me/55${s.whatsapp.replace(/\D/g, '')}" target="_blank">${formatPhone(s.whatsapp)}</a></p>
        <p><strong>📊 Status:</strong> <span class="status-text status-${s.status}">${s.status.toUpperCase()}</span></p>
        ${s.notes ? `<p><strong>📝 Observações:</strong> ${s.notes}</p>` : ''}
        ${s.photoUrls && s.photoUrls.length > 0 ? `
          <div class="service-photos">
            ${s.photoUrls.map(url => `<img src="${url}" alt="Foto do serviço" class="service-photo-thumb" onclick="window.open('${url}', '_blank')">`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="service-actions">
        <button class="btn-action btn-whatsapp" onclick="window.sendWhatsApp('${s.id}', 'reminder')">💬 WhatsApp</button>
        <button class="btn-action btn-maps" onclick="window.openMaps('${s.clientAddress}')">🗺️ Localizar</button>
        <button class="btn-action btn-routes" onclick="window.openRoutes('${s.clientAddress}')">🛣️ Rotas</button>
        <button class="btn-action btn-edit" onclick="window.editService('${s.id}')">✏️ Editar</button>
        ${s.status !== 'concluido' ? `<button class="btn-action btn-finish" onclick="window.finishService('${s.id}')">✅ Concluir</button>` : ''}
        <button class="btn-action btn-delete" onclick="window.deleteService('${s.id}')">🗑️ Excluir</button>
      </div>
    `;
    servicesList.appendChild(serviceElement);
  });
}

// 🔥 CRUD
serviceForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const btn = e.target.querySelector('button[type="submit"]');
  const isEditing = !!serviceId.value;
  
  try {
    btn.textContent = isEditing ? 'Salvando...' : 'Cadastrando...';
    btn.disabled = true;
    
    const serviceData = {
      userId: currentUser.uid,
      clientName: clientName.value,
      clientAddress: clientAddress.value,
      date: serviceDate.value,
      time: serviceTime.value,
      whatsapp: clientWhatsapp.value,
      status: serviceStatus.value,
      value: parseFloat(serviceValue.value) || 0,
      notes: serviceNotes.value,
      createdAt: isEditing ? undefined : firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      photoUrls: [] // Será preenchido após o upload
    };
    
    // 1. Upload de Fotos
    const photoFiles = servicePhotos.files;
    if (photoFiles.length > 0) {
      const uploadPromises = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const storageRef = storage.ref(`services/${currentUser.uid}/${Date.now()}_${file.name}`);
        uploadPromises.push(storageRef.put(file).then(snapshot => snapshot.ref.getDownloadURL()));
      }
      
      serviceData.photoUrls = await Promise.all(uploadPromises);
    }
    
    // 2. Salvar no Firestore
    if (isEditing) {
      // Manter fotos existentes se não houver novas
      const existingService = allServices.find(s => s.id === serviceId.value);
      if (existingService && photoFiles.length === 0) {
        serviceData.photoUrls = existingService.photoUrls || [];
      }
      
      await db.collection('services').doc(serviceId.value).update(serviceData);
      alert('✅ Agendamento atualizado com sucesso!');
    } else {
      await db.collection('services').add(serviceData);
      alert('✅ Novo agendamento salvo com sucesso!');
    }
    
    // 3. Limpar e Recarregar
    serviceForm.reset();
    serviceId.value = '';
    formTitle.textContent = '📝 Novo Agendamento';
    loadServices();
    
  } catch (error) {
    console.error('❌ Erro ao salvar agendamento:', error);
    alert('❌ Erro ao salvar agendamento: ' + error.message);
  } finally {
    btn.textContent = isEditing ? '💾 Salvar Agendamento' : '💾 Salvar Agendamento';
    btn.disabled = false;
  }
});

// 🔥 EDITAR
window.editService = function(id) {
  const s = allServices.find(service => service.id === id);
  if (!s) return;
  
  serviceId.value = s.id;
  clientName.value = s.clientName;
  clientAddress.value = s.clientAddress;
  serviceDate.value = s.date;
  serviceTime.value = s.time;
  clientWhatsapp.value = s.whatsapp;
  serviceStatus.value = s.status;
  serviceValue.value = s.value || '';
  serviceNotes.value = s.notes || '';
  formTitle.textContent = '✏️ Editar Agendamento';

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

// 🔥 WHATSAPP
function sendWhatsApp(serviceOrId, type) {
  let s = typeof serviceOrId === 'string' ? allServices.find(x => x.id === serviceOrId) : serviceOrId;
  if(!s) return;

  const phone = s.whatsapp.replace(/\D/g, '');
  let message = "";
  
  if(type === 'reminder') {
    message = `Olá ${s.clientName}, lembrete do seu agendamento em ${formatDateBR(s.date)} às ${s.time}.`;
  } else {
    message = `Olá ${s.clientName}, seu serviço foi concluído! Obrigado pela preferência.`;
  }

  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

window.sendWhatsApp = sendWhatsApp;

// 🔥 GOOGLE MAPS - LOCALIZAR
window.openMaps = function(address) {
  if (!address) {
    alert('Endereço não disponível');
    return;
  }
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/search/${encodedAddress}`, '_blank');
};

// 🔥 GOOGLE MAPS - ROTAS (NOVO)
window.openRoutes = function(address) {
  if (!address) {
    alert('Endereço não disponível');
    return;
  }
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
};

// 🔥 EXPORTAR PDF
document.getElementById('btnExportPDF')?.addEventListener('click', () => {
  const selectedDate = formatDateBR(formatDateToISO(currentDate));
  const services = allServices.filter(s => s.date === formatDateToISO(currentDate));
  
  let htmlContent = `
    <h2>Agendamentos do dia ${selectedDate}</h2>
    <table border="1" cellpadding="10">
      <tr>
        <th>Horário</th>
        <th>Cliente</th>
        <th>Endereço</th>
        <th>Valor</th>
        <th>Status</th>
      </tr>
  `;
  
  services.forEach(s => {
    htmlContent += `
      <tr>
        <td>${s.time}</td>
        <td>${s.clientName}</td>
        <td>${s.clientAddress}</td>
        <td>${formatCurrency(parseFloat(s.value) || 0)}</td>
        <td>${s.status.toUpperCase()}</td>
      </tr>
    `;
  });
  
  htmlContent += '</table>';
  
  const newWindow = window.open('', '', 'width=800,height=600');
  newWindow.document.write(htmlContent);
  newWindow.document.close();
  newWindow.print();
});

// 🔥 INICIALIZAR
console.log('✅ Sistema carregado e pronto para uso!');