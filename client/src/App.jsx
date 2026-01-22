import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, X, ArrowUp, ArrowDown, Search } from 'lucide-react';
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
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [search, setSearch] = useState('');

  const fetchCustomers = async (page, sortKey = sortConfig.key, sortDir = sortConfig.direction, searchTerm = search) => {
    try {
      const res = await axios.get(`${API_URL}/customers?page=${page}&sortBy=${sortKey}&order=${sortDir}&search=${searchTerm}`);
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
        // Reset to default sort (Newest) and page 1
        setSortConfig({ key: 'id', direction: 'desc' });
        fetchCustomers(1, 'id', 'desc');
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    fetchCustomers(1, key, direction, search); // Reset to page 1 on sort
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearch(term);
    fetchCustomers(1, sortConfig.key, sortConfig.direction, term); // Search triggers fetch
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-xl font-bold">Customers</h2>
        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={handleSearch}
                data-testid="search-input"
              />
           </div>
           <button 
             onClick={handleOpenCreate}
             className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
             data-testid="add-customer-btn"
           >
             <Plus size={16} /> Add Customer
           </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border shadow rounded">
        <table className="w-full text-left" data-testid="customer-table">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>Name {renderSortIcon('name')}</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('company')}>Company {renderSortIcon('company')}</th>
              <th className="p-3">Contact</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</th>
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

// --- Add Deal Modal ---
function AddDealModal({ isOpen, onClose, onSave, editingDeal }) {
  const [formData, setFormData] = useState({
    company: '',
    customer_name: '',
    product: '',
    amount: '',
    created_date: '',
    closed_date: '',
    employee_name: '',
    notes: ''
  });

  // Update form when editing deal changes
  useEffect(() => {
    if (editingDeal) {
      setFormData({
        company: editingDeal.company || '',
        customer_name: editingDeal.customer_name || '',
        product: editingDeal.product || '',
        amount: editingDeal.amount || '',
        created_date: editingDeal.created_date || '',
        closed_date: editingDeal.closed_date || '',
        employee_name: editingDeal.employee_name || '',
        notes: editingDeal.notes || ''
      });
    } else {
      setFormData({
        company: '',
        customer_name: '',
        product: '',
        amount: '',
        created_date: '',
        closed_date: '',
        employee_name: '',
        notes: ''
      });
    }
  }, [editingDeal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold">{editingDeal ? 'Edit Deal' : 'Add New Deal'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input required className="w-full mt-1 p-2 border rounded" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input required className="w-full mt-1 p-2 border rounded" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Details (Product)</label>
              <input required className="w-full mt-1 p-2 border rounded" value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
              <input required type="number" className="w-full mt-1 p-2 border rounded" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created Date</label>
                  <input required type="date" className="w-full mt-1 p-2 border rounded" value={formData.created_date} onChange={e => setFormData({ ...formData, created_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Closed Date</label>
                  <input type="date" className="w-full mt-1 p-2 border rounded" value={formData.closed_date} onChange={e => setFormData({ ...formData, closed_date: e.target.value })} />
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Employee Name</label>
              <input required className="w-full mt-1 p-2 border rounded" value={formData.employee_name} onChange={e => setFormData({ ...formData, employee_name: e.target.value })} />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea className="w-full mt-1 p-2 border rounded" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">{editingDeal ? 'Update Deal' : 'Save Deal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- View Deal Details Modal ---
function ViewDealModal({ deal, isOpen, onClose, onEdit }) {
  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold">Deal Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Company</label>
                     <p className="font-medium text-gray-900">{deal.company}</p>
                </div>
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                     <p className="font-medium text-gray-900">{deal.customer_name}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Product</label>
                     <p className="font-medium text-gray-900">{deal.product}</p>
                </div>
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                     <p className="font-medium text-green-600">${deal.amount}</p>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Created</label>
                     <p className="text-sm text-gray-700">{deal.created_date}</p>
                </div>
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Closed</label>
                     <p className="text-sm text-gray-700">{deal.closed_date || 'Not closed'}</p>
                </div>
            </div>
            <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Employee</label>
                 <p className="text-sm text-gray-700">{deal.employee_name}</p>
            </div>
            <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                 <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{deal.notes || 'No notes'}</p>
            </div>
        </div>
        <div className="bg-gray-50 p-4 border-t flex justify-between">
            <button onClick={() => { onEdit(deal); onClose(); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2">
                <Pencil size={16} /> Edit
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-white border rounded hover:bg-gray-100 text-gray-700 font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}

// --- Deals Pipeline (Drag and Drop) ---
function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [viewDeal, setViewDeal] = useState(null);
  const stages = ['new', 'negotiation', 'won', 'lost'];

  const fetchDeals = async () => {
    try {
        const res = await axios.get(`${API_URL}/deals`);
        setDeals(res.data);
    } catch(err) {
        console.error("Error fetching deals", err);
    }
  }

  useEffect(() => {
    fetchDeals();
  }, []);

  const onDragEnd = async (result) => {
    console.log("🔵 onDragEnd called", result);
    
    if (!result.destination) {
      console.log("❌ No destination - drag cancelled");
      return;
    }
    
    const { draggableId, destination, source } = result;
    const newStage = destination.droppableId;
    const oldStage = source.droppableId;
    
    console.log(`🟢 Dragging deal ${draggableId} from ${oldStage} to ${newStage}`);
    
    // If dropped in same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log("⚠️ Dropped in same position, no change");
      return;
    }
    
    const deal = deals.find(d => d.id.toString() === draggableId);
    console.log("📦 Found deal:", deal);
    
    // Validate close date when moving to "won"
    if (newStage === 'won' && !deal.closed_date) {
      const closeDate = prompt("This deal requires a close date. Please enter the close date (YYYY-MM-DD):");
      if (!closeDate) {
        alert("Close date is required to mark deal as Won");
        return;
      }
      
      // Update deal with close date
      try {
        console.log("📅 Updating deal with close date:", closeDate);
        await axios.put(`${API_URL}/deals/${draggableId}`, { 
          stage: newStage,
          closed_date: closeDate 
        });
        fetchDeals(); // Refresh to get updated data
        return;
      } catch (err) {
        console.error("❌ Failed to update deal", err);
        alert("Failed to update deal. Please try again.");
        return;
      }
    }
    
    const oldDeals = [...deals];
    
    // Optimistic UI Update
    const updatedDeals = deals.map(d => 
      d.id.toString() === draggableId ? { ...d, stage: newStage } : d
    );
    setDeals(updatedDeals);
    console.log("✅ Optimistic UI updated");

    // API Update
    try {
      console.log(`🌐 Calling API: PUT /deals/${draggableId} with stage: ${newStage}`);
      const response = await axios.put(`${API_URL}/deals/${draggableId}`, { stage: newStage });
      console.log("✅ API call successful", response.data);
      // Fetch fresh data from server to ensure UI is in sync
      await fetchDeals();
      console.log("🔄 Deals refreshed from server");
    } catch (err) {
      console.error("❌ Failed to update deal stage", err);
      // Revert on failure
      setDeals(oldDeals);
      alert("Failed to move deal. Please try again.");
    }
  };

  const handleSaveDeal = async (dealData) => {
      try {
          if (editingDeal) {
              // Update existing deal
              await axios.put(`${API_URL}/deals/${editingDeal.id}`, dealData);
              setEditingDeal(null);
          } else {
              // Create new deal
              await axios.post(`${API_URL}/deals`, dealData);
          }
          setAddModalOpen(false);
          fetchDeals(); // Refresh list
      } catch (err) {
          console.error("Failed to save deal", err);
          alert("Failed to save deal");
      }
  };

  const handleEdit = (deal) => {
      setEditingDeal(deal);
      setAddModalOpen(true);
  };

  const handleCloseModal = () => {
      setAddModalOpen(false);
      setEditingDeal(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Deals Pipeline</h2>
        <button 
            onClick={() => { setEditingDeal(null); setAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
            <Plus size={16} /> Add Deal
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => (
            <Droppable key={stage} droppableId={stage}>
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="p-4 bg-gray-100 rounded w-80 min-h-[400px] flex-shrink-0"
                  data-testid={`column-${stage}`}
                >
                  <h3 className="mb-4 font-bold uppercase text-gray-500 flex justify-between">
                      {stage}
                      <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {deals.filter(d => d.stage === stage).length}
                      </span>
                  </h3>
                  {deals.filter(d => d.stage === stage).map((deal, index) => (
                    <Draggable key={deal.id} draggableId={deal.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="p-4 mb-3 bg-white rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow group relative"
                          data-testid={`deal-${deal.id}`}
                        >
                          <div className="pr-6" {...provided.dragHandleProps}>
                              <p className="font-semibold text-gray-800">{deal.company}</p>
                              <p className="text-sm text-gray-600 truncate">{deal.product}</p>
                              <p className="text-sm font-bold text-green-600 mt-2">${deal.amount?.toLocaleString()}</p>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewDeal(deal); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View Details"
                          >
                              <Plus size={18} />
                          </button>
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

      <AddDealModal 
        isOpen={isAddModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveDeal}
        editingDeal={editingDeal}
      />
      
      <ViewDealModal 
        deal={viewDeal} 
        isOpen={!!viewDeal} 
        onClose={() => setViewDeal(null)}
        onEdit={handleEdit}
      />
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