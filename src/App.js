/* global grecaptcha */ // Adicionado para resolver o erro 'grecaptcha is not defined' do ESLint
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';


// Sua configuração do Firebase que você copiou do console
const firebaseConfig = {
  apiKey: "AIzaSyDa90bifuUXRgGyS30Y-P9Q6NhOnLyn21s", // SEU VALOR AQUI
  authDomain: "deliveryvitoriaapp.firebaseapp.com", // SEU VALOR AQUI
  projectId: "deliveryvitoriaapp", // SEU VALOR AQUI
  storageBucket: "deliveryvitoriaapp.firebasestorage.app", // SEU VALOR AQUI
  messagingSenderId: "97567737035", // SEU VALOR AQUI
  appId: "1:97567737035:web:0b509a3c0bb0242474c74e" // SEU VALOR AQUI
};

// Inicializa o Firebase para o aplicativo.
let appInstance;
let dbInstance;
let authInstance;
let recaptchaVerifier; // Variável global para o RecaptchaVerifier

const initialAuthTokenForBuild = null;
const appIdForBuild = 'default-app-id';


// Main App component for the Order Separator
function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeliveryFeesModal, setShowDeliveryFeesModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showProductManagementModal, setShowProductManagementModal] = useState(false); // Manter para a função interna de gerenciar
  const [chatMessage, setChatMessage] = useState('');
  const [registeredClient, setRegisteredClient] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Estados para a nova modal de decisão de entrega
  const [showDeliveryDecisionModal, setShowDeliveryDecisionModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [selectedDeliveryArea, setSelectedDeliveryArea] = useState('');

  // Estado para armazenar as estatísticas de rotas
  const [routeStats, setRouteStats] = useState({});

  // ESTADOS PARA NAVEGAÇÃO E MENU
  const [currentPage, setCurrentPage] = useState('home');
  const [showNavMenu, setShowNavMenu] = useState(false);


  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientComplement, setClientComplement] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [deliveryOption, setDeliveryOption] = useState('Receber em Casa');

  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');

  // Novos estados para verificação de telefone
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false); // Mantém para mostrar/esconder o campo OTP
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false); // Novo estado para verificar se o telefone foi validado
  const [registrationStep, setRegistrationStep] = useState(1); // 1: Info e Solicitar OTP, 2: Inserir OTP


  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  const [promotions, setPromotions] = useState([]);


  const [deliveryAreas] = useState([
    { id: 'retirar_no_local', name: 'Retirar no Local', fee: 0.00 },
    { id: 'itanhanga', name: 'Itanhangá', fee: 3.00 },
    { id: 'rio-das-pedras', name: 'Rio das Pedras', fee: 6.00 },
    { id: 'morro-do-banco', name: 'Morro do Banco', fee: 7.00 },
  ]);

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing. Please ensure firebaseConfig is correctly set.");
      setMessage("Erro: Configuração do Firebase ausente.");
      setIsAuthReady(true);
      return;
    }

    try {
      if (!appInstance) {
        appInstance = initializeApp(firebaseConfig);
        dbInstance = getFirestore(appInstance);
        authInstance = getAuth(appInstance);
      }

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          // Tenta buscar as informações do cliente no Firestore
          const clientDocRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/clients`, user.uid);
          const clientSnap = await getDoc(clientDocRef);
          if (clientSnap.exists()) {
            setRegisteredClient(clientSnap.data());
            // Preenche os campos do formulário de cadastro com os dados do cliente
            setClientName(clientSnap.data().name || '');
            setClientPhone(clientSnap.data().phone || '');
            setClientAddress(clientSnap.data().address || '');
            setClientComplement(clientSnap.data().complement || '');
            setPaymentMethod(clientSnap.data().paymentMethod || 'Dinheiro');
            setDeliveryOption(clientSnap.data().deliveryOption || 'Receber em Casa');
            setClientEmail(user.email || ''); // Preenche o email do auth se existir
            setPhoneVerified(!!clientSnap.data().phoneVerified); // Define o status de verificação do telefone
          } else {
            setRegisteredClient(null); // Nenhum cliente cadastrado para este UID
            // Limpa os campos se não há cliente registrado
            setClientName('');
            setClientPhone('');
            setClientAddress('');
            setClientComplement('');
            setPaymentMethod('Dinheiro');
            setDeliveryOption('Receber em Casa');
            setClientEmail('');
            setPhoneVerified(false);
          }
        } else {
          // Se não houver usuário logado (nem com email/senha), tenta logar anonimamente
          try {
            if (initialAuthTokenForBuild) {
              await signInWithCustomToken(authInstance, initialAuthTokenForBuild);
            } else {
              await signInAnonymously(authInstance);
            }
          } catch (error) {
            console.error("Firebase Auth Error during sign-in:", error);
            setMessage("Erro na autenticação. Tente novamente.");
            setUserId(crypto.randomUUID()); // Fallback: gera um ID de usuário aleatório
            setRegisteredClient(null);
            setPhoneVerified(false);
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribeAuth();
    } catch (error) {
      console.error("Failed to initialize Firebase services:", error);
      setMessage("Erro ao conectar ao sistema. Verifique a configuração do Firebase.");
      setIsAuthReady(true);
    }
  }, []);

  // Initialize reCAPTCHA when the registration modal is shown and step is 1
  useEffect(() => {
    if (showRegistrationModal && isAuthReady && authInstance && registrationStep === 1 && !recaptchaVerifier) {
      // Cria a div para o reCAPTCHA se ela não existir
      let recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
          recaptchaContainer = document.createElement('div');
          recaptchaContainer.id = 'recaptcha-container';
          // Adiciona a div em um local apropriado, talvez no corpo ou dentro do formulário
          document.body.appendChild(recaptchaContainer); // Pode ser ajustado para ser dentro do modal
      }

      window.recaptchaVerifier = new RecaptchaVerifier(authInstance, 'recaptcha-container', {
        'size': 'invisible', // Pode ser 'invisible' para um fluxo mais suave
        'callback': (response) => {
          // reCAPTCHA solved, allows phone number verification
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          // reCAPTCHA expired. Reset UI.
          setMessage("reCAPTCHA expirou. Por favor, tente novamente.");
          window.recaptchaVerifier.render().then(function(widgetId) {
            grecaptcha.reset(widgetId);
          });
        }
      });
      recaptchaVerifier = window.recaptchaVerifier; // Atribui a variável global
      recaptchaVerifier.render(); // Renderiza o reCAPTCHA
    }
    // Cleanup function when modal closes or step changes away from 1
    return () => {
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
            delete window.recaptchaVerifier;
            const recaptchaElement = document.getElementById('recaptcha-container');
            if (recaptchaElement) {
                recaptchaElement.innerHTML = ''; // Limpa o conteúdo
                // Opcional: remover a div do DOM se ela foi adicionada dinamicamente e não é mais necessária
                // recaptchaElement.parentNode.removeChild(recaptchaElement);
            }
        }
    };
  }, [showRegistrationModal, isAuthReady, registrationStep]);


  // Fetch products from Firestore
  useEffect(() => {
    if (!isAuthReady || !dbInstance) return;

    const productsCollectionRef = collection(dbInstance, `artifacts/${appIdForBuild}/public/data/products`);
    const q = query(productsCollectionRef);

    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      console.log("Produtos carregados do Firestore:", productsData);
    }, (error) => {
      console.error("Error fetching products from Firestore:", error);
      setMessage("Erro ao carregar produtos. Verifique as regras de segurança do Firestore e o caminho 'default-app-id'.");
    });

    return () => unsubscribeProducts();
  }, [isAuthReady]);

  // useEffect para buscar promoções do Firestore
  useEffect(() => {
    if (!isAuthReady || !dbInstance) return;

    const promotionsCollectionRef = collection(dbInstance, `artifacts/${appIdForBuild}/public/data/promotions`);
    const q = query(promotionsCollectionRef);

    const unsubscribePromotions = onSnapshot(q, (snapshot) => {
      const promotionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromotions(promotionsData);
      console.log("Promoções carregadas do Firestore:", promotionsData);
    }, (error) => {
      console.error("Error fetching promotions from Firestore:", error);
      setMessage("Erro ao carregar promoções. Verifique as regras de segurança do Firestore.");
    });

    return () => unsubscribePromotions();
  }, [isAuthReady]);

  // useEffect para buscar estatísticas de rotas do Firestore
  useEffect(() => {
    if (!isAuthReady || !dbInstance) return;

    const routeStatsCollectionRef = collection(dbInstance, `artifacts/${appIdForBuild}/public/data/deliveryRoutesStats`);
    
    const unsubscribeRouteStats = onSnapshot(routeStatsCollectionRef, (snapshot) => {
      const stats = {};
      snapshot.docs.forEach(doc => {
        stats[doc.id] = doc.data();
      });
      setRouteStats(stats);
      console.log("Estatísticas de rotas carregadas:", stats);
    }, (error) => {
      console.error("Error fetching route stats from Firestore:", error);
      setMessage("Erro ao carregar estatísticas de rotas.");
    });

    return () => unsubscribeRouteStats();
  }, [isAuthReady]);


  // Fetch orders from Firestore (for the 'Pedidos Finalizados' section)
  useEffect(() => {
    if (!isAuthReady || !dbInstance || !userId) return;

    const ordersCollectionRef = collection(dbInstance, `artifacts/${appIdForBuild}/users/${userId}/orders`);
    const q = query(ordersCollectionRef);

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      console.log("Pedidos carregados do Firestore:", ordersData);
    }, [isAuthReady, userId]);

    return () => unsubscribeOrders();
  }, [isAuthReady, userId]);


  // Function to add a product or promotion to the cart or update its quantity
  const addToCart = async (itemToAdd, isPromo = false) => {
    const priceToUse = isPromo ? itemToAdd.promoPrice : itemToAdd.price;
    const noteExtra = isPromo ? ` (Promoção: ${itemToAdd.name.replace('!', '')})` : '';

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === itemToAdd.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === itemToAdd.id
            ? { ...item, quantity: item.quantity + 1, price: priceToUse }
            : item
        );
      } else {
        return [...prevCart, {
          id: itemToAdd.id,
          name: itemToAdd.name,
          price: priceToUse,
          quantity: 1,
          note: noteExtra,
          isPromoItem: isPromo,
          imageUrl: itemToAdd.imageUrl
        }];
      }
    });

    if (!dbInstance) {
      setMessage("Erro: Banco de dados não disponível para atualizar estoque.");
      return;
    }

    try {
      const productRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/products`, itemToAdd.id);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const currentStock = productSnap.data().stock || 0;
        if (currentStock > 0) {
          await updateDoc(productRef, { stock: currentStock - 1 });
          setMessage(`"${itemToAdd.name}" adicionado ao carrinho! Estoque atualizado.`);
        } else {
          setMessage(`"${itemToAdd.name}" está fora de estoque.`);
          setCart(prevCart => prevCart.filter(item => item.id !== itemToAdd.id));
        }
      } else {
        console.warn(`Item de promoção "${itemToAdd.name}" (ID: ${itemToAdd.id}) não encontrado na coleção de produtos para atualização de estoque.`);
        setMessage(`"${itemToAdd.name}" adicionado ao carrinho, mas o estoque não pôde ser atualizado (produto não encontrado).`);
      }
    } catch (error) {
      console.error("Erro ao atualizar estoque no Firestore (adicionar):", error);
      setMessage("Erro ao atualizar estoque.");
    }
  };


  // Function to remove an item from the cart
  const removeFromCart = async (itemId) => {
    const itemToRemove = cart.find(item => item.id === itemId);

    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));

    if (itemToRemove && dbInstance) {
      try {
        const productRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/products`, itemToRemove.id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, { stock: currentStock + itemToRemove.quantity });
          setMessage(`"${itemToRemove.name}" removido do carrinho. Estoque atualizado.`);
        }
      } catch (error) {
        console.error("Erro ao atualizar estoque no Firestore (remover):", error);
        setMessage("Erro ao atualizar estoque.");
      }
    }
  };


  // Function to update the quantity of an item in the cart
  const updateQuantity = async (itemId, newQuantity) => {
    const oldItem = cart.find(item => item.id === itemId);
    if (!oldItem) return;

    const quantityDifference = newQuantity - oldItem.quantity;

    if (!dbInstance) {
      setMessage("Erro: Banco de dados não disponível para atualizar estoque.");
      return;
    }

    try {
      const productRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/products`, itemId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const currentStock = productSnap.data().stock || 0;
        let newStock = currentStock - quantityDifference;

        if (newStock >= 0) {
          await updateDoc(productRef, { stock: newStock });
          setCart((prevCart) =>
            prevCart.map((item) =>
              item.id === itemId
                ? { ...item, quantity: Math.max(1, newQuantity) }
                : item
            )
          );
          setMessage(`Quantidade de "${oldItem.name}" atualizada. Estoque: ${newStock}`);
        } else {
          setMessage(`Não há estoque suficiente de "${oldItem.name}" para esta quantidade.`);
          setCart((prevCart) =>
            prevCart.map((item) =>
              item.id === itemId
                ? { ...item, quantity: currentStock + oldItem.quantity }
                : item
            )
          );
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar estoque no Firestore (quant):", error);
      setMessage("Erro ao atualizar estoque.");
    }
  };


  // Function to update the note for a specific item in the cart
  const updateItemNote = (itemId, newNote) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        let cleanNote = newNote.replace(` (Promoção: ${item.name.replace('!', '')})`, '').trim();
        let finalNote = item.isPromoItem ? ` (Promoção: ${item.name.replace('!', '')}) ${cleanNote}`.trim() : cleanNote;
        return item.id === itemId
          ? { ...item, note: finalNote }
          : item
      })
    );
  };

  // Funcao para INICIAR o checkout (finalizar pedido da tela Home)
  const initiateCheckout = () => {
    if (cart.length === 0) {
      setMessage('O carrinho está vazio. Adicione produtos antes de finalizar o pedido.');
      return;
    }
    if (!registeredClient || !phoneVerified) { // Adicionado verificação de telefone
      setShowRegistrationModal(true);
      setMessage('Por favor, cadastre suas informações e valide seu telefone para continuar a finalização do pedido.');
      setRegistrationStep(1); // Garante que o modal de registro comece na etapa 1
      return;
    }
    setCurrentPage('checkout');
    setMessage(''); // Limpa qualquer mensagem anterior
  };

  // Nova função para REALMENTE finalizar o pedido no Firebase (executada na tela de Checkout)
  const confirmFinalOrder = async () => {
    if (!isAuthReady || !dbInstance || !userId || !registeredClient || !phoneVerified) { // Adicionado verificação de telefone
      setMessage('Sistema não pronto, informações do cliente ausentes ou telefone não validado. Tente novamente.');
      return;
    }
    setLoading(true);
    setMessage('Finalizando seu pedido...');

    try {
      let orderTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      let finalDeliveryFee = 0;
      let finalDeliveryOptionName = registeredClient.deliveryOption;

      if (registeredClient.deliveryOption === 'Receber em Casa') {
        const chosenArea = deliveryAreas.find(area => area.name === registeredClient.deliveryOption || area.id === registeredClient.deliveryOption.toLowerCase().replace(/ /g, '_'));
        if (chosenArea) {
          finalDeliveryFee = chosenArea.fee;
          orderTotal += finalDeliveryFee;
          finalDeliveryOptionName = chosenArea.name;
        }
      }

      const newOrderData = {
        items: cart,
        total: orderTotal,
        status: 'Pendente',
        timestamp: new Date().toLocaleString('pt-BR'),
        clientInfo: {
          name: registeredClient.name,
          phone: registeredClient.phone,
          address: registeredClient.address,
          complement: registeredClient.complement,
          paymentMethod: registeredClient.paymentMethod,
          deliveryOption: registeredClient.deliveryOption,
          email: registeredClient.email || null,
        },
        deliveryFee: finalDeliveryFee,
        finalDeliveryOption: finalDeliveryOptionName,
        userId: userId,
      };

      await addDoc(collection(dbInstance, `artifacts/${appIdForBuild}/users/${userId}/orders`), newOrderData);

      if (registeredClient.deliveryOption === 'Receber em Casa') {
        const chosenArea = deliveryAreas.find(area => area.name === registeredClient.deliveryOption || area.id === registeredClient.deliveryOption.toLowerCase().replace(/ /g, '_'));
        if (chosenArea) {
          const routeStatsRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/deliveryRoutesStats`, chosenArea.id);
          await setDoc(routeStatsRef, { name: chosenArea.name, count: (routeStats[chosenArea.id]?.count || 0) + 1 }, { merge: true });
        }
      }


      setCart([]);
      setLoading(false);
      setMessage(`Pedido realizado com sucesso! Você pode acompanhar o status em 'Acompanhamento de Pedidos'.`);
      setCurrentPage('orders');
    } catch (error) {
      console.error("Erro ao finalizar pedido na tela de checkout:", error);
      setMessage("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };


  // Function to update the status of an order in Firestore
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!dbInstance || !userId) {
      setMessage("Sistema não pronto ou usuário não autenticado.");
      return;
    }

    try {
      const orderDocRef = doc(dbInstance, `artifacts/${appIdForBuild}/users/${userId}/orders`, orderId);
      
      if (newStatus === 'Separado') {
        const orderToDecide = orders.find(order => order.id === orderId);
        if (orderToDecide) {
          setSelectedOrderForDelivery(orderToDecide);
          const initialDeliveryAreaId = deliveryAreas.find(area => area.name === orderToDecide.finalDeliveryOption)?.id || '';
          setSelectedDeliveryArea(initialDeliveryAreaId);
          setShowDeliveryDecisionModal(true);
          setMessage(`Pedido #${orderId.substring(0,8)}... pronto para decisão de entrega!`);
        } else {
          setMessage("Erro: Pedido não encontrado para decisão de entrega.");
        }
      } else {
        await updateDoc(orderDocRef, { status: newStatus });
        setMessage(`Status do pedido #${orderId.substring(0,8)}... atualizado para ${newStatus}`);
      }
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      setMessage("Erro ao atualizar status do pedido.");
    }
  };

  // Nova função para registrar a decisão de entrega/retirada do cliente (pós-separação)
  const handleFinalDeliveryOption = async () => {
    if (!selectedOrderForDelivery || !selectedDeliveryArea || !dbInstance || !userId) {
      setMessage('Erro: Informações de entrega incompletas ou sistema não pronto.');
      return;
    }

    setLoading(true);
    setMessage('Registrando opção de entrega...');

    try {
      const orderDocRef = doc(dbInstance, `artifacts/${appIdForBuild}/users/${userId}/orders`, selectedOrderForDelivery.id);
      const chosenArea = deliveryAreas.find(area => area.id === selectedDeliveryArea);
      const deliveryFee = chosenArea ? chosenArea.fee : 0;
      const finalStatus = chosenArea && chosenArea.id === 'retirar_no_local' ? 'Aguardando Retirada' : 'Em Rota de Entrega';

      await updateDoc(orderDocRef, {
        finalDeliveryOption: chosenArea ? chosenArea.name : 'Não Definido',
        deliveryFee: deliveryFee,
        total: selectedOrderForDelivery.total + deliveryFee,
        status: finalStatus
      });

      const routeStatsRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/deliveryRoutesStats`, chosenArea.id);
      
      await setDoc(routeStatsRef, { name: chosenArea.name, count: (routeStats[chosenArea.id]?.count || 0) + 1 }, { merge: true });

      setMessage(`Opção de entrega para pedido #${selectedOrderForDelivery.id.substring(0,8)}... registrada!`);
      setShowDeliveryDecisionModal(false);
      setSelectedOrderForDelivery(null);
      setSelectedDeliveryArea('');
    } catch (error) {
      console.error("Erro ao registrar opção de entrega final:", error);
      setMessage("Erro ao registrar opção de entrega.");
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para solicitar o código OTP
  const handleRequestOtp = async () => {
    if (!clientPhone || !authInstance) {
      setMessage('Por favor, digite um número de celular válido para solicitar o código.');
      return;
    }
    // Garante que o reCAPTCHA está pronto
    if (!window.recaptchaVerifier) {
      setMessage('Aguarde, o sistema de segurança está carregando...');
      return;
    }

    setLoading(true);
    setMessage('Solicitando código de verificação...');
    setShowOtpInput(true); // Exibe a entrada OTP imediatamente para feedback visual

    try {
        // Formata o número para o padrão E.164 (ex: +5511999999999)
        const formattedPhoneNumber = clientPhone.startsWith('+') ? clientPhone : `+55${clientPhone.replace(/\D/g, '')}`;

        const result = await signInWithPhoneNumber(authInstance, formattedPhoneNumber, window.recaptchaVerifier);
        setConfirmationResult(result);
        setMessage('Código enviado para o seu celular!');
        setRegistrationStep(2); // Avança para a etapa de verificação de OTP
    } catch (error) {
        console.error("Erro ao solicitar OTP:", error);
        let errorMessage = "Erro ao solicitar código. Tente novamente.";
        if (error.code === 'auth/too-many-requests') {
            errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
        } else if (error.code === 'auth/invalid-phone-number') {
            errorMessage = "Número de telefone inválido.";
        } else if (error.code === 'auth/missing-phone-number') {
            errorMessage = "Número de telefone ausente.";
        }
        setMessage(errorMessage);
        setShowOtpInput(false); // Esconde o campo OTP se houver erro
    } finally {
        setLoading(false);
    }
  };

  // NOVO: Função para verificar o código OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || !confirmationResult) {
      setMessage('Por favor, digite o código de verificação.');
      return;
    }

    setLoading(true);
    setMessage('Verificando código...');

    try {
      await confirmationResult.confirm(otpCode);
      setPhoneVerified(true);
      setMessage('Telefone verificado com sucesso!');
      setShowOtpInput(false); // Esconde o campo OTP após a verificação
      setOtpCode(''); // Limpa o código
      // Se a verificação foi bem-sucedida, o botão de registro final será habilitado.
    } catch (error) {
      console.error("Erro ao verificar OTP:", error);
      let errorMessage = "Código inválido ou expirado. Tente novamente.";
      if (error.code === 'auth/invalid-verification-code') {
          errorMessage = "Código de verificação inválido.";
      } else if (error.code === 'auth/code-expired') {
          errorMessage = "Código expirado. Solicite um novo.";
      }
      setMessage(errorMessage);
      setPhoneVerified(false);
    } finally {
      setLoading(false);
    }
  };


  // Function to handle client registration form submission and save to Firestore
  const handleClientRegistration = async (e) => {
    e.preventDefault();
    if (!userId || !dbInstance || !authInstance) {
      setMessage('Sistema não pronto ou usuário não autenticado. Tente novamente.');
      return;
    }

    // TODOS os campos se tornam obrigatórios para a REGISTRO COMPLETO
    if (!clientName || !clientPhone || !clientEmail || !clientPassword || clientPassword.length < 6 || !clientAddress) {
        setMessage('Por favor, preencha todos os campos obrigatórios (Nome, Celular, Email, Senha, Endereço). A senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    if (!phoneVerified) { // Adicionado verificação de telefone
        setMessage('Por favor, valide seu número de celular com o código enviado antes de registrar.');
        return;
    }

    setLoading(true);
    setMessage('Registrando cliente...');

    try {
      let finalUserId = userId; // Começa com o userId atual (pode ser anônimo)

      // Tenta criar ou logar com email/senha (Firebase Auth)
      try {
          // Verifica se já existe um usuário com este email
          const userCredential = await signInWithEmailAndPassword(authInstance, clientEmail, clientPassword);
          finalUserId = userCredential.user.uid;
      } catch (signInError) {
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password') {
              // Se não encontrou o usuário ou senha errada, tenta criar um novo
              try {
                  const userCredential = await createUserWithEmailAndPassword(authInstance, clientEmail, clientPassword);
                  finalUserId = userCredential.user.uid;
              } catch (createError) {
                  if (createError.code === 'auth/email-already-in-use') {
                      setMessage('Este email já está cadastrado. Por favor, faça login ou use outro email.');
                  } else {
                      setMessage(`Erro ao criar conta: ${createError.message}.`);
                  }
                  setLoading(false);
                  return;
              }
          } else {
              setMessage(`Erro de autenticação: ${signInError.message}.`);
              setLoading(false);
              return;
          }
      }

      // Salva/atualiza as informações do cliente no Firestore usando o UID final
      const clientDocRef = doc(dbInstance, `artifacts/${appIdForBuild}/public/data/clients`, finalUserId);
      const newClientData = {
        name: clientName,
        phone: clientPhone,
        address: clientAddress,
        complement: clientComplement,
        paymentMethod: paymentMethod,
        deliveryOption: deliveryOption,
        email: clientEmail,
        userId: finalUserId,
        phoneVerified: phoneVerified, // Salva o status de verificação
        timestamp: new Date().toLocaleString('pt-BR')
      };
      await setDoc(clientDocRef, newClientData, { merge: true }); // Usar setDoc com merge para criar/atualizar

      setRegisteredClient(newClientData);
      setMessage('Cadastro realizado com sucesso!');
      setShowRegistrationModal(false);
      setClientPassword(''); // Limpa a senha por segurança
      setRegistrationStep(1); // Reseta para a etapa 1 para um possível novo cadastro

      if (currentPage !== 'home' && currentPage !== 'checkout') {
          setCurrentPage('home'); // Redireciona para home após cadastro
      } else if (currentPage === 'checkout') {
          setMessage("Informações de cadastro atualizadas. Agora você pode confirmar seu pedido.");
      }

    } catch (error) {
      console.error("Error registering client:", error);
      setMessage("Erro ao registrar cliente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para lidar com o login de cliente existente
  const handleClientLogin = async (e) => {
    e.preventDefault();
    if (!authInstance) {
        setMessage('Sistema de autenticação não disponível. Tente novamente.');
        return;
    }
    if (!clientEmail || !clientPassword) {
        setMessage('Por favor, preencha email e senha.');
        return;
    }

    setLoading(true);
    setMessage('Fazendo login...');

    try {
        await signInWithEmailAndPassword(authInstance, clientEmail, clientPassword);
        // onAuthStateChanged já cuidará de buscar o registeredClient e definir o userId
        setMessage('Login realizado com sucesso!');
        setShowLoginModal(false);
        setClientPassword('');
        // Redireciona para home ou mantém na tela de checkout se aplicável
        if (currentPage === 'checkout' && cart.length > 0) {
            setCurrentPage('checkout');
        } else {
            setCurrentPage('home');
        }
    } catch (error) {
        console.error("Erro no login:", error);
        let errorMessage = "Erro ao fazer login. Verifique seu email e senha.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Email ou senha incorretos.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Email inválido.";
        }
        setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para fazer logout
  const handleLogout = async () => {
    if (!authInstance) {
        setMessage('Sistema de autenticação não disponível.');
        return;
    }
    try {
        await signOut(authInstance);
        setRegisteredClient(null); // Limpa o cliente registrado
        setCart([]); // Limpa o carrinho ao deslogar
        setClientEmail('');
        setClientPassword('');
        setPhoneVerified(false); // Reseta o status de verificação
        setMessage('Você saiu da sua conta.');
        setCurrentPage('home'); // Redireciona para a home
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        setMessage("Erro ao sair da conta. Tente novamente.");
    }
  };


  // Function to handle adding a new product to Firestore
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!userId || !dbInstance) {
      setMessage('Sistema não pronto ou usuário não autenticado. Tente novamente.');
      return;
    }
    if (!newProductName || !newProductPrice || !newProductStock || !newProductImageUrl) {
      setMessage('Por favor, preencha todos os campos do produto.');
      return;
    }

    setLoading(true);
    setMessage('Adicionando produto...');

    try {
      const productData = {
        name: newProductName,
        price: parseFloat(newProductPrice),
        stock: parseInt(newProductStock),
        imageUrl: newProductImageUrl,
        timestamp: new Date().toLocaleString('pt-BR'),
        addedBy: userId
      };

      await addDoc(collection(dbInstance, `artifacts/${appIdForBuild}/public/data/products`), productData);

      setMessage('Produto adicionado com sucesso!');
      setNewProductName('');
      setNewProductPrice('');
      setNewProductStock('');
      setNewProductImageUrl('');
    } catch (error) {
      console.error("Error adding product:", error);
      setMessage("Erro ao adicionar produto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };


  // Function to handle sending a chat message
  const handleSendMessage = () => {
    if (chatMessage.trim() === '') {
      setMessage('A mensagem não pode estar vazia.');
      return;
    }
    console.log('Mensagem do Cliente:', chatMessage);
    setMessage('Mensagem enviada para a equipe de separação!');
    setChatMessage('');
    setShowChatModal(false);
  };


  // Effect to clear messages after a few seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const currentDeliveryFee = selectedDeliveryArea ? 
    (deliveryAreas.find(area => area.id === selectedDeliveryArea)?.fee || 0) : 0;
  
  const estimatedTotalWithDelivery = selectedOrderForDelivery ? 
    (selectedOrderForDelivery.total + currentDeliveryFee) : 0;


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4 font-sans antialiased flex flex-col items-center w-full">
      {/* Script e Style estão no public/index.html */}

      {/* Header Section */}
      <header className="w-full bg-gradient-to-br from-red-600 to-red-800 text-white p-6 md:p-8 lg:p-10 rounded-b-3xl shadow-2xl mb-10 text-center relative transition-all duration-300">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 tracking-tight">Delivery Vitória</h1>
        <p className="text-lg md:text-xl font-light opacity-90">O seu separador de pedidos inteligente</p>
        
        {/* Menu de Três Pontinhos - Canto Superior Esquerdo */}
        <div className="absolute top-6 left-6 z-50">
            <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button focus:outline-none focus:ring-2 focus:ring-red-300"
            title="Menu de Navegação"
            aria-haspopup="true"
            aria-expanded={showNavMenu}
            >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
            </button>
            {showNavMenu && (
                <div className="nav-menu">
                    <button onClick={() => { setCurrentPage('home'); setShowNavMenu(false); }}>Home</button>
                    <button onClick={() => { setCurrentPage('orders'); setShowNavMenu(false); }}>Acompanhamento de Pedidos</button>
                    <button onClick={() => { setCurrentPage('stats'); setShowNavMenu(false); }}>Estatísticas de Rotas</button>
                    {/* Botão Gerenciar Produtos REMOVIDO: <button onClick={() => { setShowProductManagementModal(true); setShowNavMenu(false); }}>Gerenciar Produtos</button> */}
                    <button onClick={() => { setShowDeliveryFeesModal(true); setShowNavMenu(false); }}>Endereços e Taxas</button>
                    <button onClick={() => { setShowRegistrationModal(true); setShowNavMenu(false); setRegistrationStep(1);}}>Meu Cadastro</button> {/* Reseta step ao abrir */}
                    {/* Botão de Login/Logout condicional */}
                    {authInstance && authInstance.currentUser && !authInstance.currentUser.isAnonymous ? (
                        <button onClick={() => { handleLogout(); setShowNavMenu(false); }}>Sair da Conta</button>
                    ) : (
                        <button onClick={() => { setShowLoginModal(true); setShowNavMenu(false); }}>Login</button>
                    )}
                </div>
            )}
        </div>

        {/* Informações do Cliente no Canto Superior Direito */}
        <div className="absolute top-6 right-6 flex flex-col space-y-3">
            {registeredClient ? (
                <div className="bg-white text-red-700 font-bold py-2 px-4 rounded-full shadow-lg text-sm flex items-center gap-2">
                    <span className="text-xl">👤</span> {registeredClient.name.split(' ')[0]}
                    {authInstance?.currentUser?.email && <span className="text-xs font-normal">({authInstance.currentUser.email})</span>}
                </div>
            ) : ( // Se não está registrado, mostra o botão de cadastro
                <button
                onClick={() => { setShowRegistrationModal(true); setRegistrationStep(1); }} // Reseta step ao abrir
                className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button focus:outline-none focus:ring-2 focus:ring-red-300"
                title="Registro do Cliente"
                >
                <span className="text-xl">👤</span>
                </button>
            )}
        </div>
      </header>

      {/* Main Content Area - Renderizado condicionalmente */}
      <main className="w-full p-4 md:p-8 lg:p-10 flex flex-col gap-10">
        {message && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md mb-6 animate-pulse" role="alert">
            <p className="font-bold">Aviso:</p>
            <p>{message}</p>
            </div>
        )}

        {/* Home Page */}
        {currentPage === 'home' && (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Products List Section */}
            <section className="flex-1 bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Produtos Disponíveis</h2>
              {products.length === 0 ? (
                  <p className="text-gray-600 italic text-lg">Carregando produtos ou nenhum produto adicionado ainda...</p>
              ) : (
                  <div className="scrollable-list pr-2">
                  {products.map((product) => (
                      <div
                      key={product.id}
                      className="flex items-center justify-between bg-gray-50 p-4 mb-4 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:bg-red-50 transition-all duration-300 transform hover:-translate-y-1"
                      >
                      <div className="flex items-center">
                          <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-lg object-cover mr-4 border border-gray-200 shadow-sm" />
                          <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">{product.name}</h3>
                          <p className="text-red-700 text-lg font-bold">R$ {product.price ? product.price.toFixed(2) : 'N/A'}</p>
                          <p className="text-sm text-gray-500">Estoque: {product.stock || 'N/A'}</p>
                          </div>
                      </div>
                      <button
                          onClick={() => addToCart(product)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 glow-button"
                      >
                          Adicionar
                      </button>
                      </div>
                  ))}
                  </div>
              )}
            </section>

            {/* Cart and Order Summary Section */}
            <section className="flex-1 bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Carrinho (Novo Pedido)</h2>
              {cart.length === 0 ? (
                <p className="text-gray-600 italic text-lg">O carrinho está vazio. Adicione produtos para criar um pedido.</p>
              ) : (
                <div className="scrollable-list pr-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col bg-gray-50 p-4 mb-4 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:bg-red-50 transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover mr-4 border border-gray-200 shadow-sm" />
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">{item.name}</h3>
                            <p className="text-red-700 text-lg font-bold">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                            className="w-20 p-2 border border-gray-300 rounded-md text-center text-base focus:ring-red-500 focus:border-red-500"
                          />
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      {/* Observation field */}
                      <div className="mt-3 w-full">
                        <label htmlFor={`note-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Observação:
                        </label>
                        <textarea
                          id={`note-${item.id}`}
                          value={item.note.replace(` (Promoção: ${item.name.replace('!', '')})`, '').trim()}
                          onChange={(e) => updateItemNote(item.id, (item.isPromoItem ? ` (Promoção: ${item.name.replace('!', '')}) ` : '') + e.target.value)}
                          rows="2"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                          placeholder="Ex: Sem glúten, embalar para presente..."
                        ></textarea>
                        {item.isPromoItem && (
                          <p className="text-xs text-red-600 italic mt-1">Item adicionado via promoção.</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="text-right mt-6 pt-6 border-t-2 border-red-300">
                    <p className="text-2xl font-bold text-gray-800 mb-3">
                      Total: R$ {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                    </p>
                    {registeredClient && (
                      <div className="text-left bg-red-100 p-4 rounded-lg mb-4 text-base text-red-900 shadow-inner">
                        <p><span className="font-semibold">Cliente Selecionado:</span> {registeredClient.name}</p>
                        <p><span className="font-semibold">Entrega:</span> {registeredClient.deliveryOption}</p>
                        {registeredClient.email && <p><span className="font-semibold">Email:</span> {registeredClient.email}</p>}
                      </div>
                    )}
                    <button
                      onClick={initiateCheckout}
                      disabled={loading || cart.length === 0}
                      className={`mt-4 px-8 py-3 rounded-full text-white font-bold text-xl shadow-xl transition-all duration-300 glow-button
                        ${loading || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'}`}
                    >
                      {loading ? 'Processando...' : 'Finalizar Pedido'}
                    </button>
                    {message && (
                      <p className="mt-3 text-sm font-semibold text-red-700 animate-pulse">{message}</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Orders Page */}
        {currentPage === 'orders' && (
            <section className="w-full bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Acompanhamento de Pedidos</h2>
            {orders.length === 0 ? (
                <p className="text-gray-600 italic text-lg">Nenhum pedido finalizado ainda.</p>
            ) : (
                <div className="scrollable-list pr-2">
                {orders.map((order) => (
                    <div
                    key={order.id}
                    className="bg-gray-50 p-5 mb-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-100 hover:shadow-lg transition-all duration-300"
                    >
                    <div className="mb-4 md:mb-0 md:w-1/2">
                        <h3 className="text-2xl font-bold text-red-800 mb-2">Pedido #{order.id.substring(0, 8)}...</h3>
                        <p className="text-gray-700 text-sm mb-1">Data: <span className="font-medium">{order.timestamp}</span></p>
                        <p className="text-xl font-bold text-gray-900 mb-2">Total: R$ {order.total.toFixed(2)}</p>
                        <p className={`text-lg font-bold
                            ${order.status === 'Pendente' ? 'text-red-600' :
                            order.status === 'Em Separação' ? 'text-orange-500' :
                            order.status === 'Separado' ? 'text-purple-600' :
                            order.status === 'Aguardando Retirada' ? 'text-blue-600' :
                            order.status === 'Em Rota de Entrega' ? 'text-teal-600' : 'text-green-600'}`}>
                        Status: {order.status}
                        </p>
                        {order.finalDeliveryOption && (
                        <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Entrega Final:</span> {order.finalDeliveryOption} {order.deliveryFee > 0 && `(R$ ${order.deliveryFee.toFixed(2)})`}</p>
                        )}
                        {order.clientInfo && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-100 p-3 rounded-lg border border-gray-200">
                            <p><span className="font-semibold">Cliente:</span> {order.clientInfo.name}</p>
                            <p><span className="font-semibold">Telefone:</span> {order.clientInfo.phone}</p>
                            <p><span className="font-semibold">Endereço:</span> {order.clientInfo.address}{order.clientInfo.complement && `, ${order.clientInfo.complement}`}</p>
                            <p><span className="font-semibold">Pagamento:</span> {order.clientInfo.paymentMethod}</p>
                            <p><span className="font-semibold">Entrega Preferida:</span> {order.clientInfo.deliveryOption}</p>
                            {order.clientInfo.email && <p><span className="font-semibold">Email:</span> {order.clientInfo.email}</p>}
                        </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 md:pl-6">
                        <h4 className="font-semibold text-gray-800 mb-2 text-lg">Itens do Pedido:</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {order.items.map((item) => (
                            <li key={item.id} className="text-base">
                            {item.name} (<span className="font-medium">{item.quantity}x</span>)
                            {item.note && <span className="text-gray-500 italic ml-2"> (Obs: {item.note})</span>}
                            </li>
                        ))}
                        </ul>
                        {/* Botões de status */}
                        <div className="mt-4 flex flex-wrap gap-2">
                        {order.status === 'Pendente' && (
                            <button
                            onClick={() => updateOrderStatus(order.id, 'Em Separação')}
                            className="bg-red-700 hover:bg-red-800 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                            Marcar Em Separação
                            </button>
                        )}
                        {order.status === 'Em Separação' && (
                            <button
                            onClick={() => updateOrderStatus(order.id, 'Separado')}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                            Marcar Separado (Decidir Entrega)
                            </button>
                        )}
                        {(order.status === 'Aguardando Retirada' || order.status === 'Em Rota de Entrega') && (
                            <button
                            onClick={() => updateOrderStatus(order.id, 'Finalizado')}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                            Marcar como Finalizado
                            </button>
                        )}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            )}
            </section>
        )}

        {/* Stats Page */}
        {currentPage === 'stats' && (
            <section className="w-full bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Estatísticas de Rotas</h2>
            {Object.keys(routeStats).length === 0 ? (
                <p className="text-gray-600 italic text-lg">Nenhum dado de rota disponível ainda.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(routeStats).map(([routeId, data]) => (
                    <div key={routeId} className="bg-gray-50 p-4 rounded-lg shadow-md border border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900">{data.name || routeId}</h3>
                    <p className="text-gray-700 text-lg">Pedidos: <span className="font-bold text-red-700">{data.count}</span></p>
                    </div>
                ))}
                </div>
            )}
            </section>
        )}

        {/* Checkout Page - Nova tela de finalização de pedido */}
        {currentPage === 'checkout' && (
          <section className="w-full bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 pb-3 border-b-4 border-red-400 text-center">Finalizar Pedido</h2>
            {registeredClient && phoneVerified ? ( // Condicional para exibir apenas se o telefone foi verificado
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Seus Dados de Entrega e Pagamento</h3>
                <div className="bg-red-50 p-6 rounded-lg shadow-inner text-gray-800 border border-red-200">
                  <p className="text-lg mb-2"><span className="font-bold">Nome:</span> {registeredClient.name}</p>
                  <p className="text-lg mb-2"><span className="font-bold">Telefone:</span> {registeredClient.phone} {phoneVerified && <span className="text-green-600 ml-2">(Verificado)</span>}</p>
                  <p className="text-lg mb-2"><span className="font-bold">Endereço:</span> {registeredClient.address}, {registeredClient.complement}</p>
                  <p className="text-lg mb-2"><span className="font-bold">Forma de Pagamento:</span> {registeredClient.paymentMethod}</p>
                  <p className="text-lg"><span className="font-bold">Opção de Entrega:</span> {registeredClient.deliveryOption}</p>
                  {registeredClient.email && <p className="text-lg"><span className="font-bold">Email:</span> {registeredClient.email}</p>}
                  {registeredClient.deliveryOption === 'Receber em Casa' && (
                      <p className="text-base text-red-700 mt-2">
                          Taxa de Entrega Estimada: R$ {
                              (deliveryAreas.find(area => area.name === registeredClient.deliveryOption || area.id === registeredClient.deliveryOption.toLowerCase().replace(/ /g, '_'))?.fee || 0).toFixed(2)
                          }
                      </p>
                  )}
                  <button
                    onClick={() => { setShowRegistrationModal(true); setRegistrationStep(1); }}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                    Editar Cadastro
                  </button>
                </div>

                <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Resumo do Pedido</h3>
                <div className="scrollable-list pr-2 bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center">
                          <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover mr-4 shadow-sm" />
                          <div>
                              <p className="font-semibold text-gray-800 text-lg">{item.name}</p>
                              <p className="text-sm text-gray-600">Obs: {item.note || 'Nenhuma'}</p>
                          </div>
                      </div>
                      <p className="text-gray-700 text-lg">{item.quantity} x R$ {item.price.toFixed(2)} = <span className="font-bold">R$ {(item.quantity * item.price).toFixed(2)}</span></p>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-6 text-xl font-bold text-gray-800 border-t-2 border-red-300 pt-6">
                  Total do Pedido (Produtos): R$ {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                  {registeredClient.deliveryOption === 'Receber em Casa' && (
                      <p className="text-lg text-red-700 mt-1">
                          Taxa de Entrega: R$ {
                              (deliveryAreas.find(area => area.name === registeredClient.deliveryOption || area.id === registeredClient.deliveryOption.toLowerCase().replace(/ /g, '_'))?.fee || 0).toFixed(2)
                          }
                      </p>
                  )}
                  <p className="text-3xl text-green-700 mt-3">
                      Total a Pagar: R$ {
                          (cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + 
                           (registeredClient.deliveryOption === 'Receber em Casa' ? 
                             (deliveryAreas.find(area => area.name === registeredClient.deliveryOption || area.id === registeredClient.deliveryOption.toLowerCase().replace(/ /g, '_'))?.fee || 0) : 0)
                          ).toFixed(2)
                      }
                  </p>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentPage('home')}
                    className="px-8 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md text-xl"
                  >
                    Voltar ao Carrinho
                  </button>
                  <button
                    type="button"
                    onClick={confirmFinalOrder}
                    disabled={loading}
                    className={`px-8 py-3 rounded-full text-white font-bold text-xl shadow-lg transition-all duration-300 glow-button
                      ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'}`}
                  >
                    {loading ? 'Confirmando...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-red-600 text-lg text-center p-4 bg-red-100 rounded-lg border border-red-300">
                Para finalizar seu pedido, precisamos das suas informações de cadastro completas e seu telefone validado. <br/>
                Por favor, clique em **"Cadastrar Agora"** ou **"Fazer Login"** para continuar.
                <div className="flex justify-center gap-4 mt-4">
                  <button onClick={() => {setShowRegistrationModal(true); setRegistrationStep(1); }} className="text-blue-700 hover:underline font-bold py-2 px-4 bg-white rounded-full shadow-md">Cadastrar Agora</button>
                  <button onClick={() => setShowLoginModal(true)} className="text-blue-700 hover:underline font-bold py-2 px-4 bg-white rounded-full shadow-md">Fazer Login</button>
                </div>
              </p>
            )}
          </section>
        )}
      </main>

      {/* Promotions Footer Section - GLOBAL */}
      <footer className="w-full bg-gradient-to-br from-red-700 to-red-900 text-white p-8 rounded-t-3xl shadow-2xl mt-10 text-center">
        <h2 className="text-4xl font-extrabold mb-5 tracking-tight">Últimas Promoções!</h2>
        <p className="text-xl font-light mb-8 opacity-90">Não perca nossas ofertas incríveis. Adicione diretamente ao seu carrinho!</p>
        <div className="promotions-carousel flex overflow-x-auto snap-x snap-mandatory pb-6 space-x-6 px-2">
          {promotions.length === 0 ? (
              <p className="text-gray-200 italic text-lg w-full text-center">Nenhuma promoção disponível no momento.</p>
          ) : (
              promotions.map((promo) => (
                  <div
                  key={promo.id}
                  className="flex-shrink-0 w-72 bg-red-600 p-5 rounded-2xl shadow-xl flex flex-col items-center text-center snap-center border border-red-500 hover:bg-red-500 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onClick={() => addToCart(promo, true)}
                  >
                  <img
                      src={promo.imageUrl}
                      alt={promo.name}
                      className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-white shadow-md"
                  />
                  <h3 className="text-xl font-bold text-white mb-2">{promo.name}</h3>
                  <p className="text-red-100 text-sm mb-3 line-clamp-2">{promo.description}</p>
                  <p className="text-lg font-semibold text-red-200 line-through mb-1">De: R$ {promo.originalPrice ? promo.originalPrice.toFixed(2) : 'N/A'}</p>
                  <p className="text-3xl font-extrabold text-yellow-300 mb-4 drop-shadow-lg">Por: R$ {promo.promoPrice ? promo.promoPrice.toFixed(2) : 'N/A'}</p>
                  <button
                      className="bg-white hover:bg-gray-100 text-red-700 font-bold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-10glow"
                  >
                      Adicionar à Promoção
                  </button>
                  </div>
              ))
          )}
        </div>
      </footer>

      {/* Botão de Chat Flutuante - Canto Inferior Direito */}
      <button
        onClick={() => setShowChatModal(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button z-40 focus:outline-none focus:ring-2 focus:ring-blue-300"
        title="Falar com a Equipe de Atendimento"
      >
        <span className="text-2xl">💬</span>
      </button>

      {/* Client Registration Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => {setShowRegistrationModal(false); setRegistrationStep(1);}}> {/* Reseta step ao fechar */}
          <div className="modal-content !max-w-md !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">{registeredClient ? 'Editar Cadastro' : 'Novo Cadastro de Cliente'}</h2>
            
            {/* Mensagem de erro/sucesso global do modal */}
            {message && (
              <p className="mb-4 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
            )}

            {/* Etapa 1: Informações Básicas e Solicitação de OTP */}
            {registrationStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleRequestOtp(); }} className="space-y-4">
                <div>
                  <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                    required
                  />
                </div>
                
                {/* Campo de Telefone e Botão de Solicitar Código */}
                <div>
                  <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1">Número de Celular</label>
                  <div className="flex items-center space-x-2">
                      <input
                        type="tel"
                        id="clientPhone"
                        value={clientPhone}
                        onChange={(e) => {setClientPhone(e.target.value); setPhoneVerified(false); setOtpCode('');}} // Reseta verificação e OTP
                        className="flex-grow p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                        placeholder="(XX) XXXXX-XXXX"
                        required
                        disabled={phoneVerified} // Desabilita se já verificado
                      />
                      {!phoneVerified && (
                          <button
                          type="submit" // Agora é type="submit" para submeter o formulário
                          disabled={loading || !clientPhone || clientPhone.length < 10} // Mínimo de caracteres para telefone
                          className={`px-4 py-2 rounded-full text-white font-bold text-sm shadow-md transition-all duration-300
                              ${loading || !clientPhone || clientPhone.length < 10 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                          Solicitar Código
                          </button>
                      )}
                      {phoneVerified && <span className="text-green-600 font-bold">✓ Verificado</span>}
                  </div>
                  {/* reCAPTCHA container - importante para a validação de telefone */}
                  <div id="recaptcha-container" className="mt-4"></div>
                </div>

                {/* Email e Senha (obrigatórios para login seguro) */}
                <div>
                  <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (Obrigatório para login seguro)</label>
                  <input
                    type="email"
                    id="clientEmail"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                    placeholder="seu.email@exemplo.com"
                    required
                    disabled={registeredClient && registeredClient.email && !authInstance?.currentUser?.isAnonymous}
                  />
                </div>
                <div>
                  <label htmlFor="clientPassword" className="block text-sm font-medium text-gray-700 mb-1">Senha (Mínimo 6 caracteres)</label>
                  <input
                    type="password"
                    id="clientPassword"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                    placeholder="••••••••"
                    required={true}
                  />
                </div>

                {/* Campos de Endereço, Pagamento, Entrega (mantidos na etapa 1 para simplificar) */}
                <div>
                  <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="clientComplement" className="block text-sm font-medium text-gray-700 mb-1">Complemento (Ex: Apt 101, Bloco B)</label>
                  <input
                    type="text"
                    id="clientComplement"
                    value={clientComplement}
                    onChange={(e) => setClientComplement(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                    placeholder="Ex: Apartamento 101, Bloco B"
                  />
                </div>
                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 bg-white text-base"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opção de Entrega</label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="Retirar no Local"
                        checked={deliveryOption === 'Retirar no Local'}
                        onChange={(e) => setDeliveryOption(e.target.value)}
                        className="form-radio text-red-600 h-4 w-4"
                      />
                      <span className="ml-2 text-gray-800 text-base">Retirar no Local</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="Receber em Casa"
                        checked={deliveryOption === 'Receber em Casa'}
                        onChange={(e) => setDeliveryOption(e.target.value)}
                        className="form-radio text-red-600 h-4 w-4"
                      />
                      <span className="ml-2 text-gray-800 text-base">Receber em Casa</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {setShowRegistrationModal(false); setRegistrationStep(1);}}
                    className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit" // Submete o formulário para handleRequestOtp
                    disabled={loading || !clientName || !clientPhone || clientPhone.length < 10 || !clientEmail || !clientPassword || clientPassword.length < 6 || !clientAddress}
                    className={`px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button
                      ${loading || !clientName || !clientPhone || clientPhone.length < 10 || !clientEmail || !clientPassword || clientPassword.length < 6 || !clientAddress ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                  >
                    {loading ? 'Solicitando...' : 'Solicitar Código'}
                  </button>
                </div>
                <div className="text-center mt-4">
                    <p className="text-gray-600">Já tem conta? <button type="button" onClick={() => {setShowRegistrationModal(false); setShowLoginModal(true);}} className="text-blue-700 hover:underline font-bold">Faça login</button></p>
                </div>
              </form>
            )}

            {/* Etapa 2: Confirmação do Código OTP */}
            {registrationStep === 2 && (
              <div className="space-y-4">
                <p className="text-center text-lg text-gray-700">Um código de verificação foi enviado para **{clientPhone}**.</p>
                <div>
                    <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-1">Código de Verificação (SMS)</label>
                    <input
                        type="text"
                        id="otpCode"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                        placeholder="Digite o código de 6 dígitos"
                        required
                    />
                </div>
                <div className="flex justify-between space-x-4 mt-6">
                    <button
                        type="button"
                        onClick={() => { setRegistrationStep(1); setOtpCode(''); setConfirmationResult(null); setMessage('');}} // Volta para a etapa 1
                        className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
                    >
                        Voltar
                    </button>
                    <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading || !otpCode || otpCode.length !== 6} // Código OTP geralmente tem 6 dígitos
                        className={`px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button
                            ${loading || !otpCode || otpCode.length !== 6 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'}`}
                    >
                        {loading ? 'Verificando...' : 'Verificar Código'}
                    </button>
                </div>
                {phoneVerified && (
                    <div className="text-center mt-4">
                        <p className="text-green-600 font-bold text-lg">Telefone verificado! 🎉</p>
                        <button
                            type="button"
                            onClick={handleClientRegistration}
                            disabled={loading}
                            className={`mt-4 px-8 py-3 rounded-full text-white font-bold text-xl shadow-lg transition-all duration-300 glow-button
                                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                        >
                            {loading ? 'Registrando...' : (registeredClient ? 'Atualizar Cadastro' : 'Registrar')}
                        </button>
                    </div>
                )}
              </div>
            )}

            <button
              onClick={() => {setShowRegistrationModal(false); setRegistrationStep(1);}}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content !max-w-sm !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Fazer Login</h2>
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div>
                <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  id="loginEmail"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  id="loginPassword"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
              {message && (
                <p className="mt-3 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
              )}
              <div className="text-center mt-4">
                  <p className="text-gray-600">Não tem conta? <button type="button" onClick={() => {setShowLoginModal(false); setShowRegistrationModal(true); setRegistrationStep(1);}} className="text-blue-700 hover:underline font-bold">Cadastre-se</button></p>
              </div>
            </form>
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Delivery Fees Modal */}
      {showDeliveryFeesModal && (
        <div className="modal-overlay" onClick={() => setShowDeliveryFeesModal(false)}>
          <div className="modal-content !max-w-md !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Endereços e Taxas de Entrega</h2>
            <div className="space-y-4">
              {deliveryAreas.map((area) => (
                <div key={area.id} className="flex justify-between items-center bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
                  <span className="text-lg font-medium text-gray-900">{area.name}</span>
                  <span className="text-xl font-bold text-red-700">R$ {area.fee.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => setShowDeliveryFeesModal(false)}
                className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
              >
                Fechar
              </button>
            </div>
            <button
              onClick={() => setShowDeliveryFeesModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal-content !max-w-md !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Falar com a Equipe</h2>
            <div className="space-y-4">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                rows="5"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                placeholder="Digite sua mensagem aqui..."
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className="px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button bg-red-600 hover:bg-red-700 transform hover:scale-105"
              >
                Enviar Mensagem
              </button>
            </div>
            {message && (
              <p className="mt-3 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
            )}
            <button
              onClick={() => setShowChatModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Product Management Modal - Manter oculto para uso interno no futuro */}
      {showProductManagementModal && (
        <div className="modal-overlay" onClick={() => setShowProductManagementModal(false)}>
          <div className="modal-content !max-w-md !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Gerenciar Produtos</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label htmlFor="newProductName" className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  id="newProductName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor="newProductPrice" className="block text-sm font-medium text-gray-700 mb-1">Preço</label>
                <input
                  type="number"
                  id="newProductPrice"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="newProductStock" className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
                <input
                  type="number"
                  id="newProductStock"
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  min="0"
                  required
                />
              </div>
              <div>
                <label htmlFor="newProductImageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
                <input
                  type="url"
                  id="newProductImageUrl"
                  value={newProductImageUrl}
                  onChange={(e) => setNewProductImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  placeholder="https://placehold.co/100x100/FF0000/FFFFFF?text=NovoProduto"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProductManagementModal(false)}
                  className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                >
                  {loading ? 'Adicionando...' : 'Adicionar Produto'}
                </button>
              </div>
              {message && (
                <p className="mt-3 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
              )}
            </form>
            <button
              onClick={() => setShowProductManagementModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Delivery Decision Modal */}
      {showDeliveryDecisionModal && selectedOrderForDelivery && (
        <div className="modal-overlay" onClick={() => setShowDeliveryDecisionModal(false)}>
          <div className="modal-content !max-w-md !p-6" onClick={(e) => e.stopPropagation()}> {/* Ajuste de tamanho e padding aqui */}
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Decisão de Entrega/Retirada</h2>
            <p className="text-lg text-gray-700 mb-4 text-center">
              Pedido <span className="font-semibold">#{selectedOrderForDelivery.id.substring(0, 8)}...</span> está separado.
            </p>
            <p className="text-md text-gray-600 mb-5 text-center">
              Como você deseja proceder com este pedido?
            </p>

            <div className="space-y-4 mb-6">
              <label htmlFor="deliveryAreaSelect" className="block text-sm font-medium text-gray-700 mb-1">Opções de Entrega/Retirada:</label>
              <select
                id="deliveryAreaSelect"
                value={selectedDeliveryArea}
                onChange={(e) => setSelectedDeliveryArea(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 bg-white text-base"
                required
              >
                <option value="">Selecione uma opção</option>
                {deliveryAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} {area.fee > 0 ? `(Taxa: R$ ${area.fee.toFixed(2)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center mb-6 text-xl font-bold text-gray-800">
              Total do Pedido: R$ {selectedOrderForDelivery.total.toFixed(2)}
              {currentDeliveryFee > 0 && (
                <p className="text-lg text-red-700 mt-1">Taxa de Entrega: R$ {currentDeliveryFee.toFixed(2)}</p>
              )}
              <p className="text-2xl text-green-700 mt-2">Total Estimado: R$ {estimatedTotalWithDelivery.toFixed(2)}</p>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryDecisionModal(false);
                  setSelectedOrderForDelivery(null);
                  setSelectedDeliveryArea('');
                }}
                className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors shadow-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalDeliveryOption}
                disabled={loading || !selectedDeliveryArea}
                className={`px-6 py-2.5 rounded-full text-white font-bold shadow-lg transition-all duration-300 glow-button
                  ${loading || !selectedDeliveryArea ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
              >
                {loading ? 'Processando...' : 'Confirmar Decisão'}
              </button>
            </div>
            {message && (
              <p className="mt-3 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
            )}
            <button
              onClick={() => {
                setShowDeliveryDecisionModal(false);
                setSelectedOrderForDelivery(null);
                setSelectedDeliveryArea('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;




