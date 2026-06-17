import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, FileSpreadsheet, Download, RefreshCw, CheckCircle2, AlertCircle, Settings2, ShieldCheck, ShieldAlert, Coffee, Terminal } from 'lucide-react';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || "https://ratio-automation-system.onrender.com/api";

function App() {
  const [file, setFile] = useState(null);
  
  // Developer Mode States
  const [useLocalhost, setUseLocalhost] = useState(() => {
    return localStorage.getItem('dev_mode_localhost') === 'true';
  });
  const [showDevToggle, setShowDevToggle] = useState(() => {
    return localStorage.getItem('dev_mode_visible') === 'true';
  });
  const [localUrl, setLocalUrl] = useState(() => {
    return localStorage.getItem('dev_mode_local_url') || 'http://localhost:8000/api';
  });
  const devInputRef = useRef("");

  const apiBase = useLocalhost ? localUrl : DEFAULT_API_BASE;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      // Only process printable character keys (length of 1)
      if (e.key.length !== 1) return;

      devInputRef.current = (devInputRef.current + e.key.toLowerCase()).slice(-3);
      if (devInputRef.current === "dev") {
        setShowDevToggle((prevShow) => {
          const nextShow = !prevShow;
          localStorage.setItem('dev_mode_visible', String(nextShow));
          return nextShow;
        });
        devInputRef.current = "";
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Configuration parameters
  const [plateUp, setPlateUp] = useState(10);
  const [pageUp, setPageUp] = useState(1);
  const [oneUpcPlateUp, setOneUpcPlateUp] = useState(10);
  const [wasteConfig, setWasteConfig] = useState("5,10,15");
  
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
      await axios.get(`${apiBase}/health`, { timeout: 8000 });
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
  }, [pingCount, apiBase]);

  // Periodic auto-check if sleeping to see when it wakes up
  useEffect(() => {
    let interval;
    if (serverStatus === "sleeping" || serverStatus === "checking") {
      interval = setInterval(() => {
        axios.get(`${apiBase}/health`, { timeout: 5000 })
          .then(() => {
            setServerStatus("awake");
            clearInterval(interval);
          })
          .catch(() => {});
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [serverStatus, apiBase]);

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
      const response = await axios.post(`${apiBase}/calculate`, formData, {
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
        setError(useLocalhost 
          ? "Request timed out. The local server took too long to respond. Please make sure the backend server is running and responsive."
          : "Request timed out. The server took too long to respond. It may still be warming up or restarting. Please try again in a moment."
        );
      } else if (!err.response) {
        setError(useLocalhost
          ? `Network Error: Cannot connect to the local server. Please ensure your backend is running at ${localUrl} and CORS is enabled.`
          : "Network Error: Cannot connect to the server. The backend (Render.com) might be asleep or down. Please wait for the status indicator to turn green."
        );
        if (!useLocalhost) {
          setServerStatus("sleeping");
        } else {
          setServerStatus("error");
        }
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
      const response = await axios.post(`${apiBase}/export`, data, {
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
      return <p className="p-4 text-gray-500">No layout generated for this percentage.</p>;
    }

    // Get unique plates to assign colors
    const uniquePlates = Array.from(new Set(plates.map(item => item['Plate#'])));

    const plateBgColors = [
      'bg-blue-50/60 hover:bg-blue-50/80',
      'bg-emerald-50/60 hover:bg-emerald-50/80',
      'bg-amber-50/60 hover:bg-amber-50/80',
      'bg-purple-50/60 hover:bg-purple-50/80',
      'bg-rose-50/60 hover:bg-rose-50/80',
      'bg-cyan-50/60 hover:bg-cyan-50/80',
      'bg-orange-50/60 hover:bg-orange-50/80',
      'bg-teal-50/60 hover:bg-teal-50/80'
    ];

    const plateBorderColors = [
      'border-blue-200',
      'border-emerald-200',
      'border-amber-200',
      'border-purple-200',
      'border-rose-200',
      'border-cyan-200',
      'border-orange-200',
      'border-teal-200'
    ];

    const separatorBorderColors = [
      'border-t-2 border-blue-400',
      'border-t-2 border-emerald-400',
      'border-t-2 border-amber-400',
      'border-t-2 border-purple-400',
      'border-t-2 border-rose-400',
      'border-t-2 border-cyan-400',
      'border-t-2 border-orange-400',
      'border-t-2 border-teal-400'
    ];

    return (
      <div className="overflow-auto max-h-[80vh] border border-gray-200 rounded-b-lg">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
            <tr>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Plate#</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SIZE</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Plate Run</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Repeat</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Qty</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Waste</th>
              <th scope="col" className="bg-gray-100 px-4 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Rec#</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {plates.map((item, itemIdx) => {
              const plateVal = item['Plate#'];
              const plateColorIdx = uniquePlates.indexOf(plateVal) % plateBgColors.length;
              const isNewPlate = itemIdx === 0 || plates[itemIdx - 1]['Plate#'] !== plateVal;
              
              const bgClass = plateBgColors[plateColorIdx];
              const borderClass = isNewPlate 
                ? (itemIdx === 0 ? '' : separatorBorderColors[plateColorIdx]) 
                : 'border-t border-gray-200/40';

              return (
                <tr 
                  key={itemIdx} 
                  className={`${bgClass} ${borderClass} transition-colors`}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900">{plateVal}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{item['SIZE']}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-indigo-700 font-extrabold">{item['Plate Run']}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 font-medium">{item['Repeat']}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-bold">{item['Qty']}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{item['Waste']}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">{item['Rec#']}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header & Status Indicator */}
        <div className="text-center relative pb-2">
          <div className="absolute right-0 top-0 flex flex-col items-end space-y-1 z-10">
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm border border-gray-200">
              {useLocalhost && (
                <Terminal className="w-3.5 h-3.5 text-red-500 animate-pulse mr-0.5" title="Localhost Dev Mode Active" />
              )}
              {serverStatus === "checking" && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span className="text-[11px] font-semibold text-gray-600">Connecting...</span>
                </>
              )}
              {serverStatus === "awake" && (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[11px] font-bold text-green-600">Awake</span>
                </>
              )}
              {serverStatus === "sleeping" && (
                <>
                  <Coffee className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                  <span className="text-[11px] font-semibold text-amber-600">Waking Up...</span>
                </>
              )}
              {serverStatus === "error" && (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[11px] font-bold text-red-600">Offline</span>
                </>
              )}
              <button 
                onClick={() => setPingCount(prev => prev + 1)}
                className="text-gray-400 hover:text-indigo-600 transition"
                title="Ping server status manually"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            {showDevToggle && (
              <div className="flex flex-col items-end space-y-1.5 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-all duration-300">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-gray-700">Localhost API</span>
                  <button
                    onClick={() => {
                      const nextVal = !useLocalhost;
                      setUseLocalhost(nextVal);
                      localStorage.setItem('dev_mode_localhost', String(nextVal));
                    }}
                    className={`w-7 h-3.5 rounded-full transition-colors relative outline-none flex items-center ${useLocalhost ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-[2px] left-[2px] w-2.5 h-2.5 rounded-full bg-white transition-transform ${useLocalhost ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                </div>
                {useLocalhost && (
                  <input
                    type="text"
                    value={localUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalUrl(val);
                      localStorage.setItem('dev_mode_local_url', val);
                    }}
                    placeholder="http://localhost:8000/api"
                    className="w-40 px-1.5 py-0.5 text-[10px] border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                  />
                )}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Ratio Automation System
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure your stepping parameters to generate multi-sheet Excel layouts.
          </p>
        </div>

        {/* Upload & Config Zone */}
        {!data && (
          <div className="max-w-2xl mx-auto bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-4">
            
            {/* Warning if server is sleeping */}
            {serverStatus === "sleeping" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-start">
                <Coffee className="w-4 h-4 mr-2 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  {useLocalhost ? (
                    <>
                      <span className="font-bold">Local server is not responding (Localhost Dev Mode).</span> Please ensure your backend server is running at <code className="bg-amber-100 px-1 rounded">{localUrl}</code>.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Server is currently sleeping (Render.com Free Tier).</span> It takes about 50-60 seconds to spin up. The app is checking the connection automatically.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Config Fields */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-bold text-gray-800 flex items-center mb-3">
                <Settings2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                Stepping Configure
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Plate Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={plateUp} 
                    onChange={(e) => setPlateUp(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Page Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={pageUp} 
                    onChange={(e) => setPageUp(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" title="Plate Up (one upc per plate)">One UPC Plate Up</label>
                  <input 
                    type="number" 
                    min="1"
                    value={oneUpcPlateUp} 
                    onChange={(e) => setOneUpcPlateUp(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Paper Waste (%)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 5,10,15"
                    value={wasteConfig} 
                    onChange={(e) => setWasteConfig(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex justify-center px-4 py-6 border-2 border-indigo-300 border-dashed rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <div className="space-y-2 text-center">
                <UploadCloud className="mx-auto h-10 w-10 text-indigo-500" />
                <div className="flex text-xs text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-semibold text-indigo-700 hover:text-indigo-600 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-[10px] text-gray-400">Excel (.xlsx, .xls) or CSV</p>
                {file && (
                  <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-900 font-semibold mt-2 bg-white px-3 py-1.5 rounded shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-xs flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error details:</span>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-center pt-2">
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`px-6 py-2 rounded text-sm font-semibold transition-all ${
                  !file || loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                } flex items-center text-white`}
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Calculating...</>
                ) : (
                  "Start Stepping"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {data && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2.5 mb-3 sm:mb-0">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Stepping Complete</h3>
                  <p className="text-xs text-gray-400">Multiple sheets generated based on Waste % limits.</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => { setData(null); setFile(null); setActiveTab(null); }}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 font-semibold rounded hover:bg-gray-200 transition"
                >
                  Start Over
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-1.5 text-xs bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition flex items-center shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Analyze Excel
                </button>
              </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {Object.keys(data).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      whitespace-nowrap py-2.5 px-1 border-b-2 font-bold text-xs transition-colors
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-4 py-2.5 flex flex-wrap justify-between items-center text-white">
                <h4 className="text-sm font-bold">Layout for {activeTab} Waste Limit</h4>
                <div className="text-xs font-semibold bg-gray-700 px-2 py-0.5 rounded-full">
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
