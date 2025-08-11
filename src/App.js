import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, updateDoc, doc } from 'firebase/firestore';


// Sua configuração do Firebase que você copiou do console
const firebaseConfig = {
  apiKey: "AIzaSyDa90bifuUXRgGyS30Y-P9Q6NhOnLyn21s", // SEU VALOR AQUI
  authDomain: "deliveryvitoriaapp.firebaseapp.com", // SEU VALOR AQUI
  projectId: "deliveryvitoriaapp", // SEU VALOR AQUI
  storageBucket: "deliveryvitoriaapp.firebasestorage.app", // SEU VALOR AQUI
  messagingSenderId: "97567737035", // SEU VALOR AQUI
  appId: "1:97567737035:web:0b509a3c0bb0242474c74e" // SEU VALOR AQUI
};

// Inicializa o Firebase para o aplicativo. Esta variável 'app' será usada para outros serviços.
// A inicialização foi movida para dentro do useEffect para garantir que ocorra apenas uma vez e após a verificação de config.
let appInstance; // Usamos um nome diferente para evitar conflito com 'app' no escopo do React
let dbInstance;
let authInstance;

// IMPORTANT: The __initial_auth_token and __app_id are provided by the Canvas environment.
// We keep them as fallback/for Canvas environment.
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


// Main App component for the Order Separator
function App() {
  // State to store products loaded from Firestore
  const [products, setProducts] = useState([]);
  // State to manage items in the cart (pending order)
  const [cart, setCart] = useState([]);
  // State to store finalized orders
  const [orders, setOrders] = useState([]);
  // State to manage a simple loading indicator
  const [loading, setLoading] = useState(false);
  // State for messages to the user (e.g., "Pedido realizado!")
  const [message, setMessage] = useState('');
  // State to control the visibility of the registration modal
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  // State to control the visibility of the delivery fees modal
  const [showDeliveryFeesModal, setShowDeliveryFeesModal] = useState(false);
  // State to control the visibility of the chat modal
  const [showChatModal, setShowChatModal] = useState(false);
  // State to control the visibility of the product management modal
  const [showProductManagementModal, setShowProductManagementModal] = useState(false);
  // State for the chat message input
  const [chatMessage, setChatMessage] = useState('');
  // State to store registered client information (for prototype)
  const [registeredClient, setRegisteredClient] = useState(null);
  // State to store the authenticated user ID
  const [userId, setUserId] = useState(null);
  // State to track if Firebase Auth is ready
  const [isAuthReady, setIsAuthReady] = useState(false);


  // --- Client Registration Form States ---
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientComplement, setClientComplement] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro'); // Default payment
  const [deliveryOption, setDeliveryOption] = useState('Receber em Casa'); // Default delivery

  // --- Product Management Form States ---
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');


  // Sample promotions (these are still static for now)
  const [promotions] = useState([
    {
      id: 'promo-arroz',
      name: 'Super Arroz Camil na Promoção!',
      description: 'Arroz Camil 5kg com 15% de desconto!',
      originalPrice: 25.50,
      promoPrice: 21.67, // 25.50 * 0.85
      imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Arroz+Camil+Promo'
    },
    {
      id: 'promo-feijao',
      name: 'Feijão Kicaldo da Semana!',
      description: 'Feijão Carioca Kicaldo 1kg por apenas R$ 7.50!',
      originalPrice: 8.90,
      promoPrice: 7.50,
      imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Feijao+Kicaldo+Promo'
    },
    {
      id: 'promo-cafe-pao',
      name: 'Combo Café Pilão + Pão Pullman!',
      description: 'Café Pilão 500g e Pão de Forma Pullman juntos por R$ 20.00!',
      originalPrice: 15.00 + 6.80,
      promoPrice: 20.00,
      imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Combo+Cafe+Pao'
    },
  ]);

  // Delivery addresses and their fees (still static for now)
  const [deliveryAreas] = useState([
    { id: 'itanhanga', name: 'Itanhangá', fee: 3.00 },
    { id: 'rio-das-pedras', name: 'Rio das Pedras', fee: 6.00 },
    { id: 'morro-do-banco', name: 'Morro do Banco', fee: 7.00 },
  ]);

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing. Please ensure firebaseConfig is correctly set.");
      setMessage("Erro: Configuração do Firebase ausente.");
      setIsAuthReady(true); // Mark as ready to avoid infinite loading if config is missing
      return;
    }

    try {
      if (!appInstance) { // Initialize Firebase app only once
        appInstance = initializeApp(firebaseConfig);
        dbInstance = getFirestore(appInstance);
        authInstance = getAuth(appInstance);
      }

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          } catch (error) {
            console.error("Firebase Auth Error during sign-in:", error);
            setMessage("Erro na autenticação. Tente novamente.");
            // Fallback: generate a random user ID for unauthenticated access if anonymous sign-in fails
            setUserId(crypto.randomUUID());
          }
        }
        setIsAuthReady(true); // Mark auth as ready regardless of success or failure
      });

      return () => unsubscribeAuth(); // Cleanup auth listener on component unmount
    } catch (error) {
      console.error("Failed to initialize Firebase services:", error);
      setMessage("Erro ao conectar ao sistema. Verifique a configuração do Firebase.");
      setIsAuthReady(true); // Ensure UI doesn't hang on loading
    }
  }, []); // Run only once on component mount

  // Fetch products from Firestore
  useEffect(() => {
    if (!isAuthReady || !dbInstance) return; // Wait for auth to be ready and dbInstance to be initialized

    // The collection path for public products
    const productsCollectionRef = collection(dbInstance, `artifacts/${appId}/public/data/products`);
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
      setMessage("Erro ao carregar produtos. Verifique as regras de segurança do Firestore.");
    });

    return () => unsubscribeProducts(); // Cleanup listener
  }, [isAuthReady, dbInstance, appId]); // Re-run when auth is ready or dbInstance changes

  // Fetch orders from Firestore (for the 'Pedidos Finalizados' section)
  useEffect(() => {
    if (!isAuthReady || !dbInstance || !userId) return;

    // The collection path for user-specific orders
    const ordersCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${userId}/orders`);
    const q = query(ordersCollectionRef);

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      console.log("Pedidos carregados do Firestore:", ordersData);
    }, (error) => {
      console.error("Error fetching orders from Firestore:", error);
      setMessage("Erro ao carregar pedidos. Verifique as regras de segurança do Firestore.");
    });

    return () => unsubscribeOrders(); // Cleanup listener
  }, [isAuthReady, dbInstance, userId, appId]); // Re-run when auth is ready, dbInstance, or userId changes


  // Function to add a product or promotion to the cart or update its quantity
  const addToCart = (itemToAdd, isPromo = false) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === itemToAdd.id);
      let priceToUse = isPromo ? itemToAdd.promoPrice : itemToAdd.price;
      let noteExtra = isPromo ? ` (Promoção: ${itemToAdd.name.replace('!', '')})` : ''; // Clean up name for note

      if (existingItem) {
        // If item already in cart, increment quantity
        return prevCart.map((item) =>
          item.id === itemToAdd.id
            ? { ...item, quantity: item.quantity + 1, price: priceToUse } // Update price if it was added from promo later
            : item
        );
      } else {
        // If new item, add to cart with quantity 1, empty note, and the specific price
        return [...prevCart, {
          id: itemToAdd.id,
          name: itemToAdd.name,
          price: priceToUse,
          quantity: 1,
          note: noteExtra,
          isPromoItem: isPromo, // Flag to indicate if it's a promotion item
          imageUrl: itemToAdd.imageUrl // Keep the image URL in the cart item
        }];
      }
    });
    setMessage(`"${itemToAdd.name}" adicionado ao carrinho!`);
  };


  // Function to remove an item from the cart
  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  // Function to update the quantity of an item in the cart
  const updateQuantity = (itemId, newQuantity) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, newQuantity) } // Ensure quantity is at least 1
          : item
      )
    );
  };

  // Function to update the note for a specific item in the cart
  const updateItemNote = (itemId, newNote) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        let cleanNote = newNote.replace(` (Promoção: ${item.name.replace('!', '')})`, '').trim(); // Remove promo note for editing
        let finalNote = item.isPromoItem ? ` (Promoção: ${item.name.replace('!', '')}) ${cleanNote}`.trim() : cleanNote;
        return item.id === itemId
          ? { ...item, note: finalNote }
          : item
      })
    );
  };

  // Function to finalize the current cart as a new order and save to Firestore
  const finalizeOrder = async () => {
    if (cart.length === 0) {
      setMessage('O carrinho está vazio. Adicione produtos antes de finalizar o pedido.');
      return;
    }
    if (!isAuthReady || !dbInstance || !userId) {
      setMessage('Sistema não pronto ou usuário não autenticado. Tente novamente.');
      return;
    }

    setLoading(true);
    setMessage('Processando pedido...');

    try {
      const newOrderData = {
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'Pendente',
        timestamp: new Date().toLocaleString('pt-BR'),
        clientInfo: registeredClient,
        userId: userId, // Store the user ID with the order
      };

      // Add the order to Firestore in a user-specific collection
      await addDoc(collection(dbInstance, `artifacts/${appId}/users/${userId}/orders`), newOrderData);

      setCart([]); // Clear the cart after finalizing the order
      setLoading(false);
      setMessage(`Pedido realizado com sucesso!`);
    } catch (error) {
      console.error("Error finalizing order:", error);
      setMessage("Erro ao finalizar pedido. Tente novamente.");
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
      // Reference to the specific order document
      const orderDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/orders`, orderId);
      await updateDoc(orderDocRef, { status: newStatus });
      setMessage(`Status do pedido #${orderId} atualizado para ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      setMessage("Erro ao atualizar status do pedido.");
    }
  };


  // Function to handle client registration form submission and save to Firestore
  const handleClientRegistration = async (e) => {
    e.preventDefault();
    if (!userId || !dbInstance) {
      setMessage('Sistema não pronto ou usuário não autenticado. Tente novamente.');
      return;
    }

    setLoading(true);
    setMessage('Registrando cliente...');

    try {
      const newClientData = {
        name: clientName,
        phone: clientPhone,
        address: clientAddress,
        complement: clientComplement,
        paymentMethod: paymentMethod,
        deliveryOption: deliveryOption,
        userId: userId, // Associate client with the authenticated user
        timestamp: new Date().toLocaleString('pt-BR')
      };
      // Store client data in a public collection
      await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/clients`), newClientData);

      setRegisteredClient(newClientData); // Set the locally registered client
      setMessage('Cadastro realizado com sucesso!');
      setShowRegistrationModal(false);
      // Clear form fields
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setClientComplement('');
      setPaymentMethod('Dinheiro');
      setDeliveryOption('Receber em Casa');
    } catch (error) {
      console.error("Error registering client:", error);
      setMessage("Erro ao registrar cliente. Tente novamente.");
    } finally {
      setLoading(false);
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
        price: parseFloat(newProductPrice), // Convert price to number
        stock: parseInt(newProductStock),   // Convert stock to number
        imageUrl: newProductImageUrl,
        timestamp: new Date().toLocaleString('pt-BR'),
        addedBy: userId // Track who added the product
      };

      // Add the new product to the 'products' collection in Firestore
      await addDoc(collection(dbInstance, `artifacts/${appId}/public/data/products`), productData);

      setMessage('Produto adicionado com sucesso!');
      // Clear form fields after submission
      setNewProductName('');
      setNewProductPrice('');
      setNewProductStock('');
      setNewProductImageUrl('');
      // No need to close modal immediately, user might want to add more
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
    // Simulate sending message (e.g., to a backend or another user)
    console.log('Mensagem do Cliente:', chatMessage);
    setMessage('Mensagem enviada para a equipe de separação!');
    setChatMessage(''); // Clear chat input
    setShowChatModal(false); // Close chat modal after sending
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4 font-sans antialiased flex flex-col items-center">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
        body { font-family: 'Inter', sans-serif; }
        .scrollable-list {
            max-height: 400px; /* Fixed height for scrollable areas */
            overflow-y: auto; /* Enable vertical scrolling */
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background-color: white;
            padding: 2.5rem; /* Increased padding */
            border-radius: 1.5rem; /* rounded-3xl */
            box-shadow: 0 15px 25px rgba(0, 0, 0, 0.3); /* shadow-2xl */
            max-width: 550px; /* Increased max-width */
            width: 90%;
            position: relative;
            transform: translateY(-20px); /* Slight lift animation */
            animation: modalPopIn 0.3s ease-out forwards;
        }
        @keyframes modalPopIn {
          from { opacity: 0; transform: translateY(-50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Custom scrollbar for horizontal promotions */
        .promotions-carousel::-webkit-scrollbar {
          height: 8px;
        }
        .promotions-carousel::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .promotions-carousel::-webkit-scrollbar-thumb {
          background: #ef4444; /* red-500 */
          border-radius: 10px;
        }
        .promotions-carousel::-webkit-scrollbar-thumb:hover {
          background: #dc2626; /* red-600 */
        }
        .glow-button {
          transition: all 0.3s ease;
        }
        .glow-button:hover {
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); /* red-500 with glow */
        }
        `}
      </style>

      {/* Header Section */}
      <header className="w-full max-w-4xl bg-gradient-to-br from-red-600 to-red-800 text-white p-6 rounded-3xl shadow-2xl mb-10 text-center relative transform transition-all duration-300 hover:scale-10glow">
        <h1 className="text-5xl font-extrabold mb-3 tracking-tight">Delivery Vitória</h1>
        <p className="text-xl font-light opacity-90">O seu separador de pedidos inteligente</p>
        {/* Chat button on top-left */}
        <div className="absolute top-6 left-6 flex flex-col space-y-3">
            <button
            onClick={() => setShowChatModal(true)}
            className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button"
            title="Falar com a Equipe"
            >
            <span className="text-xl">💬</span>
            </button>
            <button
            onClick={() => setShowProductManagementModal(true)}
            className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button"
            title="Gerenciar Produtos"
            >
            <span className="text-xl">📦</span>
            </button>
        </div>
        {/* Registration and Delivery Fees buttons on top-right */}
        <div className="absolute top-6 right-6 flex flex-col space-y-3">
            <button
            onClick={() => setShowRegistrationModal(true)}
            className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button"
            title="Registro do Cliente"
            >
            <span className="text-xl">👤</span>
            </button>
            <button
            onClick={() => setShowDeliveryFeesModal(true)}
            className="bg-white text-red-700 hover:bg-red-800 hover:text-white font-bold p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 glow-button"
            title="Endereços e Taxas"
            >
            <span className="text-xl">📍</span>
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl bg-white p-8 rounded-3xl shadow-2xl flex flex-col gap-10 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Products List Section */}
          <section className="flex-1 bg-gray-50 p-6 rounded-2xl shadow-inner">
            <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Produtos Disponíveis</h2>
            {products.length === 0 ? (
                <p className="text-gray-600 italic text-lg">Carregando produtos ou nenhum produto adicionado ainda...</p>
            ) : (
                <div className="scrollable-list pr-2">
                {products.map((product) => (
                    <div
                    key={product.id}
                    className="flex items-center justify-between bg-white p-4 mb-4 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:bg-red-50 transition-all duration-300 transform hover:-translate-y-1"
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
          <section className="flex-1 bg-gray-50 p-6 rounded-2xl shadow-inner">
            <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Carrinho (Novo Pedido)</h2>
            {cart.length === 0 ? (
              <p className="text-gray-600 italic text-lg">O carrinho está vazio. Adicione produtos para criar um pedido.</p>
            ) : (
              <div className="scrollable-list pr-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col bg-white p-4 mb-4 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:bg-red-50 transition-all duration-300 transform hover:-translate-y-1"
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
                        value={item.note.replace(` (Promoção: ${item.name.replace('!', '')})`, '').trim()} // Remove promo note for editing
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
                    Total: R$ {cart.reduce((sum, item) => item.price * item.quantity, 0).toFixed(2)}
                  </p>
                  {registeredClient && (
                    <div className="text-left bg-red-100 p-4 rounded-lg mb-4 text-base text-red-900 shadow-inner">
                      <p><span className="font-semibold">Cliente Selecionado:</span> {registeredClient.name}</p>
                      <p><span className="font-semibold">Entrega:</span> {registeredClient.deliveryOption}</p>
                    </div>
                  )}
                  <button
                    onClick={finalizeOrder}
                    disabled={loading || cart.length === 0}
                    className={`mt-4 px-8 py-3 rounded-full text-white font-bold text-xl shadow-xl transition-all duration-300 glow-button
                      ${loading || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'}`}
                  >
                    {loading ? 'Finalizando...' : 'Finalizar Pedido'}
                  </button>
                  {message && (
                    <p className="mt-3 text-sm font-semibold text-red-700 animate-pulse">{message}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Orders List Section */}
        <section className="w-full bg-gray-50 p-6 rounded-2xl shadow-inner mt-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-5 pb-3 border-b-4 border-red-400">Pedidos Finalizados</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600 italic text-lg">Nenhum pedido finalizado ainda.</p>
          ) : (
            <div className="scrollable-list pr-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-5 mb-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="mb-4 md:mb-0 md:w-1/2">
                    <h3 className="text-2xl font-bold text-red-800 mb-2">Pedido #{order.id.substring(0, 8)}...</h3> {/* Shortened ID for display */}
                    <p className="text-gray-700 text-sm mb-1">Data: <span className="font-medium">{order.timestamp}</span></p>
                    <p className="text-xl font-bold text-gray-900 mb-2">Total: R$ {order.total.toFixed(2)}</p>
                    <p className={`text-lg font-bold ${order.status === 'Pendente' ? 'text-red-600' : 'text-green-600'}`}>
                      Status: {order.status}
                    </p>
                    {order.clientInfo && (
                      <div className="mt-3 text-sm text-gray-600 bg-gray-100 p-3 rounded-lg border border-gray-200">
                        <p><span className="font-semibold">Cliente:</span> {order.clientInfo.name}</p>
                        <p><span className="font-semibold">Telefone:</span> {order.clientInfo.phone}</p>
                        <p><span className="font-semibold">Endereço:</span> {order.clientInfo.address}{order.clientInfo.complement && `, ${order.clientInfo.complement}`}</p>
                        <p><span className="font-semibold">Pagamento:</span> {order.clientInfo.paymentMethod}</p>
                        <p><span className="font-semibold">Entrega:</span> {order.clientInfo.deliveryOption}</p>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Em Separação')}
                        className="bg-red-700 hover:bg-red-800 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                      >
                        Em Separação
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Separado')}
                        className="bg-gray-700 hover:bg-gray-800 text-white text-sm py-2 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
                      >
                        Marcar como Separado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Promotions Footer Section */}
      <footer className="w-full max-w-4xl bg-gradient-to-br from-red-700 to-red-900 text-white p-8 rounded-3xl shadow-2xl mt-10 text-center">
        <h2 className="text-4xl font-extrabold mb-5 tracking-tight">Últimas Promoções!</h2>
        <p className="text-xl font-light mb-8 opacity-90">Não perca nossas ofertas incríveis. Adicione diretamente ao seu carrinho!</p>
        <div className="promotions-carousel flex overflow-x-auto snap-x snap-mandatory pb-6 space-x-6 px-2">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="flex-shrink-0 w-72 bg-red-600 p-5 rounded-2xl shadow-xl flex flex-col items-center text-center snap-center border border-red-500 hover:bg-red-500 transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => addToCart(promo, true)} // Make entire card clickable
            >
              <img
                src={promo.imageUrl}
                alt={promo.name}
                className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-white shadow-md"
              />
              <h3 className="text-xl font-bold text-white mb-2">{promo.name}</h3>
              <p className="text-red-100 text-sm mb-3 line-clamp-2">{promo.description}</p>
              <p className="text-lg font-semibold text-red-200 line-through mb-1">De: R$ {promo.originalPrice.toFixed(2)}</p>
              <p className="text-3xl font-extrabold text-yellow-300 mb-4 drop-shadow-lg">Por: R$ {promo.promoPrice.toFixed(2)}</p>
              <button
                className="bg-white hover:bg-gray-100 text-red-700 font-bold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-10glow"
              >
                Adicionar à Promoção
              </button>
            </div>
          ))}
        </div>
      </footer>


      {/* Client Registration Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">Cadastro do Cliente</h2>
            <form onSubmit={handleClientRegistration} className="space-y-4">
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
              <div>
                <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1">Número de Celular</label>
                <input
                  type="tel"
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-base"
                  required
                />
              </div>
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
                <label htmlFor="clientComplement" className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
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
                  onClick={() => setShowRegistrationModal(false)}
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
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
              {message && (
                <p className="mt-3 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
              )}
            </form>
            <button
              onClick={() => setShowRegistrationModal(false)}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

      {/* Product Management Modal */}
      {showProductManagementModal && (
        <div className="modal-overlay" onClick={() => setShowProductManagementModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

export default App;
