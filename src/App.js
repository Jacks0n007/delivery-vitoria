import React, { useState, useEffect } from 'react';

// Main App component for the Order Separator
function App() {
  // Define a list of sample products for the market with real names and descriptive placeholder images
  const [products] = useState([
    { id: 1, name: 'Arroz 5kg Camil', price: 25.50, stock: 50, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Arroz+Camil' },
    { id: 2, name: 'Feijão Carioca Kicaldo 1kg', price: 8.90, stock: 75, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Feijao+Kicaldo' },
    { id: 3, name: 'Óleo de Soja Soya 900ml', price: 7.20, stock: 60, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Oleo+Soya' },
    { id: 4, name: 'Macarrão Dona Benta Espaguete 500g', price: 4.00, stock: 100, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Macarrao+Dona+Benta' },
    { id: 5, name: 'Café Pilão Tradicional 500g', price: 15.00, stock: 40, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Cafe+Pilao' },
    { id: 6, name: 'Leite Integral Piracanjuba 1L', price: 5.99, stock: 90, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Leite+Piracanjuba' },
    { id: 7, name: 'Açúcar União Refinado 1kg', price: 3.50, stock: 80, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Acucar+Uniao' },
    { id: 8, name: 'Pão de Forma Pullman Tradicional', price: 6.80, stock: 30, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Pao+Pullman' },
    { id: 9, name: 'Sabonete Líquido Lux Suave', price: 12.00, stock: 25, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Sabonete+Lux' },
    { id: 10, name: 'Papel Higiênico Neve 4 Rolos', price: 10.50, stock: 35, imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Papel+Neve' },
  ]);

  // Define a list of sample promotions with real names and specific placeholder images
  const [promotions] = useState([
    {
      id: 'promo-arroz',
      name: 'Super Arroz Camil na Promoção!',
      description: 'Arroz Camil 5kg com 15% de desconto!',
      originalPrice: 25.50,
      promoPrice: 21.67, // 25.50 * 0.85
      imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Arroz+Camil+Promo' // Specific placeholder for promo
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
      originalPrice: 15.00 + 6.80, // Sum of individual prices
      promoPrice: 20.00,
      imageUrl: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Combo+Cafe+Pao'
    },
  ]);

  // Define delivery addresses and their fees
  const [deliveryAreas] = useState([
    { id: 'itanhanga', name: 'Itanhangá', fee: 3.00 },
    { id: 'rio-das-pedras', name: 'Rio das Pedras', fee: 6.00 },
    { id: 'morro-do-banco', name: 'Morro do Banco', fee: 7.00 },
  ]);

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
  // State for the chat message input
  const [chatMessage, setChatMessage] = useState('');
  // State to store registered client information (for prototype)
  const [registeredClient, setRegisteredClient] = useState(null);


  // --- Client Registration Form States ---
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientComplement, setClientComplement] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro'); // Default payment
  const [deliveryOption, setDeliveryOption] = useState('Receber em Casa'); // Default delivery


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

  // Function to finalize the current cart as a new order
  const finalizeOrder = () => {
    if (cart.length === 0) {
      setMessage('O carrinho está vazio. Adicione produtos antes de finalizar o pedido.');
      return;
    }

    setLoading(true);
    setMessage('Processando pedido...');

    // Simulate API call delay
    setTimeout(() => {
      const newOrder = {
        id: orders.length + 1, // Simple ID generation
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'Pendente', // Initial status
        timestamp: new Date().toLocaleString('pt-BR'),
        clientInfo: registeredClient, // Attach client info to the order
      };
      setOrders((prevOrders) => [...prevOrders, newOrder]);
      setCart([]); // Clear the cart after finalizing the order
      setLoading(false);
      setMessage(`Pedido #${newOrder.id} realizado com sucesso!`);
    }, 1500); // 1.5 second delay
  };

  // Function to update the status of an order
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  // Function to handle client registration form submission
  const handleClientRegistration = (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setLoading(true);
    setMessage('Registrando cliente...');

    setTimeout(() => {
      const newClient = {
        name: clientName,
        phone: clientPhone,
        address: clientAddress,
        complement: clientComplement,
        paymentMethod: paymentMethod,
        deliveryOption: deliveryOption,
      };
      setRegisteredClient(newClient); // Store the client info
      console.log('Cliente Registrado:', newClient); // Log for prototype verification
      setLoading(false);
      setMessage('Cadastro realizado com sucesso!');
      setShowRegistrationModal(false); // Close the modal
      // Clear form fields after submission
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setClientComplement('');
      setPaymentMethod('Dinheiro');
      setDeliveryOption('Receber em Casa');
    }, 1000); // Simulate API call
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
    <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased flex flex-col items-center">
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
            border-radius: 0.75rem; /* rounded-lg */
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2); /* shadow-xl */
            max-width: 500px; /* Increased max-width */
            width: 90%;
            position: relative;
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
        `}
      </style>

      {/* Header Section */}
      <header className="w-full max-w-4xl bg-gradient-to-r from-red-600 to-red-800 text-white p-6 rounded-lg shadow-xl mb-8 text-center relative">
        <h1 className="text-4xl font-bold mb-2">Delivery Vitória</h1>
        <p className="text-xl">O seu separador de pedidos inteligente</p>
        {/* Chat button on top-left */}
        <div className="absolute top-4 left-4">
            <button
            onClick={() => setShowChatModal(true)}
            className="bg-white text-red-700 hover:bg-red-100 font-bold p-2 rounded-full shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            title="Falar com a Equipe"
            >
            <span className="text-xl">💬</span>
            </button>
        </div>
        {/* Registration and Delivery Fees buttons on top-right */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
            onClick={() => setShowRegistrationModal(true)}
            className="bg-white text-red-700 hover:bg-red-100 font-bold p-2 rounded-full shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            title="Registro do Cliente"
            >
            <span className="text-xl">👤</span>
            </button>
            <button
            onClick={() => setShowDeliveryFeesModal(true)}
            className="bg-white text-red-700 hover:bg-red-100 font-bold p-2 rounded-full shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            title="Endereços e Taxas"
            >
            <span className="text-xl">📍</span>
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-xl flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Products List Section */}
          <section className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-red-300">Produtos Disponíveis</h2>
            <div className="scrollable-list pr-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-white p-3 mb-3 rounded-lg shadow-sm hover:bg-red-50 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-md object-cover mr-3 border border-gray-200" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                      <p className="text-gray-600">R$ {product.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">Estoque: {product.stock}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Cart and Order Summary Section */}
          <section className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-red-300">Carrinho (Novo Pedido)</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 italic">O carrinho está vazio. Adicione produtos para criar um pedido.</p>
            ) : (
              <div className="scrollable-list pr-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col bg-white p-3 mb-3 rounded-lg shadow-sm hover:bg-red-50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover mr-3 border border-gray-200" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                          <p className="text-gray-600">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                          className="w-16 p-1 border border-gray-300 rounded-md text-center"
                        />
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    {/* Observation field */}
                    <div className="mt-2 w-full">
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
                <div className="text-right mt-4 pt-4 border-t-2 border-red-300">
                  <p className="text-xl font-bold text-gray-800">
                    Total: R$ {cart.reduce((sum, item) => item.price * item.quantity, 0).toFixed(2)}
                  </p>
                  {registeredClient && (
                    <div className="text-left bg-red-50 p-3 rounded-md mb-3 text-sm text-red-800">
                      <p>Cliente selecionado: <span className="font-semibold">{registeredClient.name}</span></p>
                      <p>Entrega: <span className="font-semibold">{registeredClient.deliveryOption}</span></p>
                    </div>
                  )}
                  <button
                    onClick={finalizeOrder}
                    disabled={loading || cart.length === 0}
                    className={`mt-4 px-6 py-3 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300
                      ${loading || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                  >
                    {loading ? 'Finalizando...' : 'Finalizar Pedido'}
                  </button>
                  {message && (
                    <p className="mt-2 text-sm font-semibold text-red-700 animate-pulse">{message}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Orders List Section (moved to main content area for better layout consistency) */}
        <section className="w-full bg-white p-6 rounded-lg shadow-xl mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-red-300">Pedidos Finalizados</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 italic">Nenhum pedido finalizado ainda.</p>
          ) : (
            <div className="scrollable-list pr-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-4 mb-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-start md:items-center"
                >
                  <div className="mb-3 md:mb-0">
                    <h3 className="text-xl font-bold text-red-800 mb-1">Pedido #{order.id}</h3>
                    <p className="text-gray-700">Data: {order.timestamp}</p>
                    <p className="text-lg font-semibold text-gray-900">Total: R$ {order.total.toFixed(2)}</p>
                    <p className={`text-md font-bold ${order.status === 'Pendente' ? 'text-red-600' : 'text-gray-800'}`}>
                      Status: {order.status}
                    </p>
                    {order.clientInfo && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p><span className="font-semibold">Cliente:</span> {order.clientInfo.name}</p>
                        <p><span className="font-semibold">Telefone:</span> {order.clientInfo.phone}</p>
                        <p><span className="font-semibold">Endereço:</span> {order.clientInfo.address}{order.clientInfo.complement && `, ${order.clientInfo.complement}`}</p>
                        <p><span className="font-semibold">Pagamento:</span> {order.clientInfo.paymentMethod}</p>
                        <p><span className="font-semibold">Entrega:</span> {order.clientInfo.deliveryOption}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-1/2">
                    <h4 className="font-semibold text-gray-800 mb-2">Itens:</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {order.items.map((item) => (
                        <li key={item.id} className="text-sm">
                          {item.name} ({item.quantity}x)
                          {item.note && <span className="text-gray-500 italic ml-2"> (Obs: {item.note})</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Em Separação')}
                        className="bg-red-700 hover:bg-red-800 text-white text-sm py-1 px-3 rounded-full shadow-md transition-colors"
                      >
                        Em Separação
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Separado')}
                        className="bg-gray-700 hover:bg-gray-800 text-white text-sm py-1 px-3 rounded-full shadow-md transition-colors"
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

      {/* Promotions Footer Section - Now a dedicated section outside main for clarity */}
      <footer className="w-full max-w-4xl bg-red-800 text-white p-6 rounded-lg shadow-xl mt-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Últimas Promoções!</h2>
        <p className="text-lg mb-6">Não perca nossas ofertas incríveis. Adicione diretamente ao seu carrinho!</p>
        <div className="promotions-carousel flex overflow-x-auto snap-x snap-mandatory pb-4 space-x-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="flex-shrink-0 w-64 bg-red-700 p-4 rounded-lg shadow-lg flex flex-col items-center text-center snap-center hover:bg-red-600 transition-colors duration-200"
            >
              <img
                src={promo.imageUrl}
                alt={promo.name}
                className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-white"
              />
              <h3 className="text-lg font-bold text-white mb-1">{promo.name}</h3>
              <p className="text-red-100 text-sm mb-2">{promo.description}</p>
              <p className="text-md font-semibold text-white line-through">De: R$ {promo.originalPrice.toFixed(2)}</p>
              <p className="text-xl font-extrabold text-white mb-3">Por: R$ {promo.promoPrice.toFixed(2)}</p>
              <button
                onClick={() => addToCart(promo, true)}
                className="bg-white hover:bg-gray-100 text-red-700 font-bold py-2 px-4 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Ex: Apartamento 101, Bloco B"
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
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
                      className="form-radio text-red-600"
                    />
                    <span className="ml-2 text-gray-800">Retirar no Local</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="deliveryOption"
                      value="Receber em Casa"
                      checked={deliveryOption === 'Receber em Casa'}
                      onChange={(e) => setDeliveryOption(e.target.value)}
                      className="form-radio text-red-600"
                    />
                    <span className="ml-2 text-gray-800">Receber em Casa</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRegistrationModal(false)}
                  className="px-6 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-full text-white font-bold shadow-md transition-all duration-300
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'}`}
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
              {message && (
                <p className="mt-2 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
              )}
            </form>
            <button
              onClick={() => setShowRegistrationModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl"
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
                <div key={area.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg shadow-sm">
                  <span className="text-lg font-medium text-gray-900">{area.name}</span>
                  <span className="text-lg font-bold text-red-700">R$ {area.fee.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => setShowDeliveryFeesModal(false)}
                className="px-6 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
            <button
              onClick={() => setShowDeliveryFeesModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl"
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
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-base"
                placeholder="Digite sua mensagem aqui..."
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="px-6 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className="px-6 py-2 rounded-full text-white font-bold shadow-md transition-all duration-300 bg-red-600 hover:bg-red-700 transform hover:scale-105"
              >
                Enviar Mensagem
              </button>
            </div>
            {message && (
              <p className="mt-2 text-center text-sm font-semibold text-red-700 animate-pulse">{message}</p>
            )}
            <button
              onClick={() => setShowChatModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl"
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