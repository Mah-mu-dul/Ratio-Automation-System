import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, FileSpreadsheet, Download, RefreshCw, CheckCircle2, AlertCircle, Settings2, ShieldCheck, ShieldAlert, Coffee } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "https://ratio-automation-system.onrender.com/api";

function App() {
  const [file, setFile] = useState(null);
  
  // Configuration parameters
  const [plateUp, setPlateUp] = useState(10);
  const [pageUp, setPageUp] = useState(1);
  const [oneUpcPlateUp, setOneUpcPlateUp] = useState(10);
  const [wasteConfig, setWasteConfig] = useState("4,5,6");
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [error, setError] = useState("");
  
  // Server Wakeup Status
  const [serverStatus, setServerStatus] = useState("checking"); // 'checking', 'awake', 'sleeping', 'error'
  const [pingCount, setPingCount] = useState(0);

  const checkHealth = async () => {
    setServerStatus("checking");
    try {
      // Direct call to health check endpoint
      await axios.get(`${API_BASE}/health`, { timeout: 8000 });
      setServerStatus("awake");
    } catch (err) {
      console.error("Health check error:", err);
      if (err.code === "ECONNABORTED" || !err.response) {
        // Network timeout or no response means the free-tier server is likely sleeping
        setServerStatus("sleeping");
      } else {
        setServerStatus("error");
      }
    }
  };

  useEffect(() => {
    checkHealth();
  }, [pingCount]);

  // Periodic auto-check if sleeping to see when it wakes up
  useEffect(() => {
    let interval;
    if (serverStatus === "sleeping" || serverStatus === "checking") {
      interval = setInterval(() => {
        axios.get(`${API_BASE}/health`, { timeout: 5000 })
          .then(() => {
            setServerStatus("awake");
            clearInterval(interval);
          })
          .catch(() => {});
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [serverStatus]);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("plate_up", plateUp);
    formData.append("page_up", pageUp);
    formData.append("one_upc_plate_up", oneUpcPlateUp);
    formData.append("waste_config", wasteConfig);

    try {
      const response = await axios.post(`${API_BASE}/calculate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000 // Allow up to 90 seconds in case backend is doing heavy calculation or spinning up
      });
      const resultData = response.data;
      setData(resultData);
      
      const keys = Object.keys(resultData);
      if (keys.length > 0) setActiveTab(keys[0]);
      
    } catch (err) {
      console.error(err);
      if (err.code === "ECONNABORTED") {
        setError("Request timed out. The server took too long to respond. It may still be warming up or restarting. Please try again in a moment.");
      } else if (!err.response) {
        setError("Network Error: Cannot connect to the server. The backend (Render.com) might be asleep or down. Please wait for the status indicator to turn green.");
        setServerStatus("sleeping");
      } else {
        setError(err.response?.data?.detail || `Error (${err.response.status}): ${err.response.statusText || 'Processing failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const response = await axios.post(`${API_BASE}/export`, data, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stepping.xls');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Failed to export Excel file. Please try again.");
    }
  };

  const renderTable = (plates) => {
    if (!plates || plates.length === 0) {
      return <p className="p-6 text-gray-500">No layout generated for this percentage.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate#</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIZE</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Run</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Repeat</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Waste</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rec#</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plates.map((item, itemIdx) => (
              <tr key={itemIdx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item['Plate#']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item['SIZE']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-600 font-bold">{item['Plate Run']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item['Repeat']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">{item['Qty']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-500 font-medium">{item['Waste']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item['Rec#']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Status Indicator */}
        <div className="text-center relative">
          <div className="absolute right-0 top-0 flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
            {serverStatus === "checking" && (
              <>
                <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                <span className="text-xs font-semibold text-gray-600">Connecting Server...</span>
              </>
            )}
            {serverStatus === "awake" && (
              <>
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-green-600">Server Awake</span>
              </>
            )}
            {serverStatus === "sleeping" && (
              <>
                <Coffee className="w-4 h-4 text-amber-500 animate-bounce" />
                <span className="text-xs font-semibold text-amber-600">Waking Up (takes ~1 min)...</span>
              </>
            )}
            {serverStatus === "error" && (
              <>
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-600">Server Offline</span>
              </>
            )}
            <button 
              onClick={() => setPingCount(prev => prev + 1)}
              className="text-gray-400 hover:text-indigo-600 transition"
              title="Ping server status manually"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Ratio Automation System
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Configure your stepping parameters to generate multi-sheet Excel layouts.
          </p>
        </div>

        {/* Upload & Config Zone */}
        {!data && (
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            
            {/* Warning if server is sleeping */}
            {serverStatus === "sleeping" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start">
                <Coffee className="w-5 h-5 mr-3 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Server is currently sleeping (Render.com Free Tier).</span> It takes about 50-60 seconds of waiting for it to spin up. The app is automatically checking the connection. You can wait or try upload once the indicator at the top turns green.
                </div>
              </div>
            )}

            {/* Config Fields */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                <Settings2 className="w-5 h-5 mr-2 text-indigo-600" />
                Stepping Configure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plate Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={plateUp} 
                    onChange={(e) => setPlateUp(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={pageUp} 
                    onChange={(e) => setPageUp(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" title="Plate Up (one upc per plate)">One UPC Plate Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={oneUpcPlateUp} 
                    onChange={(e) => setOneUpcPlateUp(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Paper Waste (%)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 4,5,6"
                    value={wasteConfig} 
                    onChange={(e) => setWasteConfig(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-indigo-300 border-dashed rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <div className="space-y-4 text-center">
                <UploadCloud className="mx-auto h-16 w-16 text-indigo-500" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-700 hover:text-indigo-600 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">Excel (.xlsx, .xls) or CSV</p>
                {file && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-900 font-semibold mt-4 bg-white px-4 py-2 rounded-lg shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error details:</span>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`px-8 py-3 rounded-lg text-white font-semibold transition-all ${
                  !file || loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
                } flex items-center`}
              >
                {loading ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Calculating...</>
                ) : (
                  "Start Stepping"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {data && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Stepping Complete</h3>
                  <p className="text-sm text-gray-500">Multiple sheets generated based on Waste % limits.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => { setData(null); setFile(null); setActiveTab(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Start Over
                </button>
                <button
                  onClick={handleExport}
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center shadow-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Analyze Excel
                </button>
              </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {Object.keys(data).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors
                      ${activeTab === tab
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    Waste Limit: {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Stepping Results Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-6 py-4 flex flex-wrap justify-between items-center text-white">
                <h4 className="text-xl font-bold">Layout for {activeTab} Waste Limit</h4>
                <div className="text-sm font-medium bg-gray-700 px-3 py-1 rounded-full">
                  Plates Used: {data[activeTab]?.total_plates || 0}
                </div>
              </div>
              
              {data[activeTab] && renderTable(data[activeTab].plates)}
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
