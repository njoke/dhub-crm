import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, X } from 'lucide-react';
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
    } catch {
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
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', status: 'Active', phone: '', company: '' });

  const fetchCustomers = async (page) => {
    try {
      const res = await axios.get(`${API_URL}/customers?page=${page}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCustomers(1); }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', status: 'Active', phone: '', company: '' });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setFormData({ 
      name: customer.name || '', 
      email: customer.email || '', 
      status: customer.status || 'Active',
      phone: customer.phone || '',
      company: customer.company || ''
    });
    setEditingId(customer.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/customers/${editingId}`, formData);
        fetchCustomers(data.page);
      } else {
        await axios.post(`${API_URL}/customers`, formData);
        fetchCustomers(1);
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save customer", err);
      alert("Failed to save customer");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await axios.delete(`${API_URL}/customers/${id}`);
      fetchCustomers(data.page);
    } catch (err) {
      console.error("Failed to delete customer", err);
      alert("Failed to delete customer");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Customers</h2>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
          data-testid="add-customer-btn"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="overflow-x-auto bg-white border shadow rounded">
        <table className="w-full text-left" data-testid="customer-table">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Company</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{c.id}</td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-gray-600">{c.company || '-'}</td>
                <td className="p-3 text-sm">
                  <div className="text-gray-900">{c.email}</div>
                  <div className="text-gray-500">{c.phone}</div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    c.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    c.status === 'Inactive' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(c)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.data.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-4 mt-4 items-center">
        <button 
          disabled={data.page === 1}
          onClick={() => fetchCustomers(data.page - 1)}
          className="px-4 py-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          data-testid="prev-btn"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {data.page}</span>
        <button 
          onClick={() => fetchCustomers(data.page + 1)}
          disabled={data.data.length < 10} 
          className="px-4 py-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          data-testid="next-btn"
        >
          Next
        </button>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" data-testid="modal-overlay">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input 
                    required
                    className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    type="email"
                    className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
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
    const oldDeals = [...deals];
    
    // Optimistic UI Update
    const updatedDeals = deals.map(d => 
      d.id.toString() === draggableId ? { ...d, stage: newStage } : d
    );
    setDeals(updatedDeals);

    // API Update
    try {
      await axios.put(`${API_URL}/deals/${draggableId}`, { stage: newStage });
    } catch (err) {
      console.error("Failed to update deal stage", err);
      // Revert on failure
      setDeals(oldDeals);
      alert("Failed to move deal. Please try again.");
    }
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