import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import logo from './assets/logo.png';

const API_URL = 'http://localhost:3001/api';



// --- Login Component ---
function Login() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, creds);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid Credentials');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 relative">
      <div className="absolute top-4 left-4 flex items-center gap-2">
         <img src={logo} alt="D-Hub CRM Logo" className="h-64" />
      </div>
      <form onSubmit={handleLogin} className="p-8 bg-white rounded shadow-md w-96">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="D-Hub CRM Logo" className="h-64" />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-center text-blue-600">D-Hub CRM</h1>
        {error && <div className="p-2 mb-4 text-white bg-red-500 rounded" data-testid="error-msg">{error}</div>}
        <input 
          className="w-full p-2 mb-4 border rounded" 
          placeholder="Username" 
          value={creds.username}
          onChange={e => setCreds({...creds, username: e.target.value})}
          data-testid="username"
        />
        <input 
          className="w-full p-2 mb-4 border rounded" 
          placeholder="Password" 
          type="password"
          value={creds.password}
          onChange={e => setCreds({...creds, password: e.target.value})}
          data-testid="password"
        />
        <button className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700" type="submit" data-testid="login-btn">Login</button>
      </form>
    </div>
  );
}

// --- Customers Table with Pagination ---
function Customers() {
  const [data, setData] = useState({ data: [], total: 0, page: 1 });
  const [isModalOpen, setModalOpen] = useState(false);

  const fetchCustomers = async (page) => {
    const res = await axios.get(`${API_URL}/customers?page=${page}`);
    setData(res.data);
  };

  useEffect(() => { fetchCustomers(1); }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Customers</h2>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-white bg-green-600 rounded"
          data-testid="add-customer-btn"
        >
          Add Customer
        </button>
      </div>

      <table className="w-full bg-white border shadow" data-testid="customer-table">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map(c => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{c.id}</td>
              <td className="p-3">{c.name}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-sm ${c.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center gap-4 mt-4">
        <button 
          disabled={data.page === 1}
          onClick={() => fetchCustomers(data.page - 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          data-testid="prev-btn"
        >
          Previous
        </button>
        <span className="py-2">Page {data.page}</span>
        <button 
          onClick={() => fetchCustomers(data.page + 1)}
          className="px-4 py-2 bg-gray-200 rounded"
          data-testid="next-btn"
        >
          Next
        </button>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" data-testid="modal-overlay">
          <div className="p-6 bg-white rounded shadow-lg w-96">
            <h3 className="mb-4 text-xl font-bold">New Customer</h3>
            <p className="mb-4 text-gray-600">This is a test modal. It traps focus.</p>
            <button 
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-white bg-red-500 rounded"
              data-testid="close-modal-btn"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Deals Pipeline (Drag and Drop) ---
function Pipeline() {
  const [deals, setDeals] = useState([]);
  const stages = ['new', 'negotiation', 'won', 'lost'];

  useEffect(() => {
    axios.get(`${API_URL}/deals`).then(res => setDeals(res.data));
  }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    
    // Optimistic UI Update
    const updatedDeals = deals.map(d => 
      d.id.toString() === draggableId ? { ...d, stage: newStage } : d
    );
    setDeals(updatedDeals);

    // API Update
    await axios.put(`${API_URL}/deals/${draggableId}`, { stage: newStage });
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-bold">Deals Pipeline</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto">
          {stages.map(stage => (
            <Droppable key={stage} droppableId={stage}>
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="p-4 bg-gray-100 rounded w-72 min-h-[400px]"
                  data-testid={`column-${stage}`}
                >
                  <h3 className="mb-4 font-bold uppercase text-gray-500">{stage}</h3>
                  {deals.filter(d => d.stage === stage).map((deal, index) => (
                    <Draggable key={deal.id} draggableId={deal.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-4 mb-2 bg-white rounded shadow cursor-move hover:bg-blue-50"
                          data-testid={`deal-${deal.id}`}
                        >
                          <p className="font-semibold">{deal.title}</p>
                          <p className="text-sm text-gray-500">${deal.amount}</p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

// --- Main Layout ---
function Dashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState('customers');

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between p-4 text-white bg-blue-800">
        <h1 className="text-xl font-bold">D-Hub CRM</h1>
        <div className="flex gap-4">
          <button onClick={() => setView('customers')} className={view === 'customers' ? 'underline font-bold' : ''}>Customers</button>
          <button onClick={() => setView('pipeline')} className={view === 'pipeline' ? 'underline font-bold' : ''}>Pipeline</button>
          <button onClick={logout} className="px-3 py-1 bg-red-600 rounded">Logout</button>
        </div>
      </nav>
      {view === 'customers' ? <Customers /> : <Pipeline />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}