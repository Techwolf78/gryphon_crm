import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  updateDoc
} from "firebase/firestore";
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiDatabase } from "react-icons/fi";
import { ldTaskCategories, ldTaskDescriptions } from "../Learning/ldTaskData";
import { toast } from "react-toastify";

const TaskDataManager = () => {
  const [taskNames, setTaskNames] = useState([]);
  const [taskDescriptions, setTaskDescriptions] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState({ description: "", category: "", classification: "" });
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState({ description: "", category: "", classification: "" });

  useEffect(() => {
    const unsubNames = onSnapshot(collection(db, "task_names"), (snapshot) => {
      setTaskNames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubDescs = onSnapshot(collection(db, "task_descriptions"), (snapshot) => {
      setTaskDescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubNames(); unsubDescs(); };
  }, []);

  const handleAddName = async () => {
    if (!newName.trim()) return;
    await addDoc(collection(db, "task_names"), { name: newName, active: true });
    setNewName("");
  };

  const handleAddDesc = async () => {
    if (!newDesc.description.trim() || !newDesc.category.trim() || !newDesc.classification.trim()) {
      toast.error("Please fill all description fields");
      return;
    }
    await addDoc(collection(db, "task_descriptions"), { ...newDesc, active: true });
    setNewDesc({ description: "", category: "", classification: "" });
    toast.success("Description added");
  };

  const handleUpdateDesc = async (id) => {
    if (!editValue.description.trim() || !editValue.category.trim() || !editValue.classification.trim()) {
      toast.error("Fields cannot be empty");
      return;
    }
    await updateDoc(doc(db, "task_descriptions", id), { ...editValue });
    setEditingId(null);
    toast.success("Description updated");
  };

  const handleSeedData = async () => {
    if (!window.confirm("This will seed the initial data into Firestore. Continue?")) return;
    
    try {
      const batch = writeBatch(db);
      
      // Seed Task Names
      const uniqueNames = [...new Set(ldTaskCategories.flatMap(cat => cat.tasks))];
      uniqueNames.forEach(name => {
        const ref = doc(collection(db, "task_names"));
        batch.set(ref, { name, active: true });
      });

      // Seed Task Descriptions
      ldTaskDescriptions.forEach(desc => {
        const ref = doc(collection(db, "task_descriptions"));
        batch.set(ref, { ...desc, active: true });
      });

      await batch.commit();
      toast.success("Database Seeded Successfully");
    } catch (error) {
      console.error("Seeding Error:", error);
      toast.error("Seeding Failed");
    }
  };

  const handleDelete = async (coll, id) => {
    if (window.confirm("Are you sure?")) {
      await deleteDoc(doc(db, coll, id));
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-1">Task Data Management</h2>
          <p className="text-xs text-indigo-600">Configure the dynamic task names and default descriptions used in the L&D Task Manager.</p>
        </div>
        <button 
          onClick={handleSeedData}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-[10px] uppercase shadow-sm"
        >
          <FiDatabase size={14} /> Seed Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Task Names Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Task Names</h3>
          <div className="flex gap-2">
            <input 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add new task category..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleAddName}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FiPlus className="text-lg" />
            </button>
          </div>
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
            {taskNames.map((item) => (
              <div key={item.id} className="group flex items-center justify-between p-3 hover:bg-white border-b border-gray-100 transition-colors last:border-0 text-sm italic">
                <span className="text-gray-700">{item.name}</span>
                <button onClick={() => handleDelete("task_names", item.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Task Descriptions Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Task Descriptions Mapping</h3>
          <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input 
                value={newDesc.description}
                onChange={(e) => setNewDesc({...newDesc, description: e.target.value})}
                placeholder="Description"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input 
                value={newDesc.category}
                onChange={(e) => setNewDesc({...newDesc, category: e.target.value})}
                placeholder="Category"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input 
                value={newDesc.classification}
                onChange={(e) => setNewDesc({...newDesc, classification: e.target.value})}
                placeholder="Classification"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button 
              onClick={handleAddDesc}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200"
            >
              Add Description Mapping
            </button>
          </div>

          <div className="bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 font-bold text-[10px] uppercase text-gray-500 border-b border-gray-200">
              <div className="col-span-4">Description</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-3">Classification</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {taskDescriptions.map((item) => (
              <div key={item.id} className="group p-3 hover:bg-white border-b border-gray-100 transition-colors last:border-0 text-xs">
                {editingId === item.id ? (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input 
                      className="col-span-4 px-2 py-1 border rounded"
                      value={editValue.description}
                      onChange={(e) => setEditValue({...editValue, description: e.target.value})}
                    />
                    <input 
                      className="col-span-3 px-2 py-1 border rounded"
                      value={editValue.category}
                      onChange={(e) => setEditValue({...editValue, category: e.target.value})}
                    />
                    <input 
                      className="col-span-3 px-2 py-1 border rounded"
                      value={editValue.classification}
                      onChange={(e) => setEditValue({...editValue, classification: e.target.value})}
                    />
                    <div className="col-span-2 flex justify-end gap-1">
                      <button onClick={() => handleUpdateDesc(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><FiCheck /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><FiX /></button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 font-semibold text-gray-800 truncate" title={item.description}>{item.description}</div>
                    <div className="col-span-3 text-gray-500 truncate" title={item.category}>{item.category}</div>
                    <div className="col-span-3 text-gray-500 truncate" title={item.classification}>{item.classification}</div>
                    <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingId(item.id); setEditValue({ ...item }); }} className="p-1 text-gray-400 hover:text-indigo-600"><FiEdit2 /></button>
                      <button onClick={() => handleDelete("task_descriptions", item.id)} className="p-1 text-gray-400 hover:text-red-500"><FiTrash2 /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDataManager;