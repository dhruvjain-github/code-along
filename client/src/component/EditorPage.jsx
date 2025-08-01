import { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import {useLocation}  from "react-router-dom"
import toast from "react-hot-toast";
import { initSocket} from "../socket";
import { useNavigate, useParams } from "react-router-dom";
import Terminal from "./Terminal";
import FileTree from "./FileTree";


const EditorPage = () => {
           
  const[clients,setClient]=useState([])
  const[terminalHeight, setTerminalHeight] = useState(30) // Terminal height as percentage
  const[isTerminalCollapsed, setIsTerminalCollapsed] = useState(false) // Track if terminal is collapsed
  const[currentFile, setCurrentFile] = useState("") // Track current selected file
  const[fileContent, setFileContent] = useState("") // Store current file content
  const socketRef=useRef(null);
  const codeRef=useRef(null)
  const location =useLocation()
  const {roomId}=useParams();
  const navigate=useNavigate();
  const isResizing = useRef(false);
  const justFinishedResizing = useRef(false);

  const [filetree, setFiletree] = useState({})

  const getFiletree=async ()=>{
    const response = await fetch('http://localhost:5000/files')
    const result=await response.json()
    setFiletree(result.tree)
  }

  // Function to handle file selection and load content
  const handleFileSelect = async (filePath) => {
    setCurrentFile(filePath);
    try {
      const response = await fetch(`http://localhost:5000/files/read/${filePath}`);
      const result = await response.json();
      if (response.ok) {
        setFileContent(result.content);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
    }
  };

  // Function to save file content
  const handleSaveFile = async (content) => {
    if (!currentFile) return;
    
    try {
      const response = await fetch('http://localhost:5000/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: currentFile, content })
      });
      
      if (response.ok) {
        console.log('File saved successfully');
        setFileContent(content);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const editorRef = useRef(null);

  useEffect(() => {
    getFiletree()
    // Automatically load main.cpp
    handleFileSelect('main.cpp')
  }, [])
  
             
           
          useEffect(()=>{
            const init=async()=>{
              socketRef.current=await initSocket();
              socketRef.current.on('connect_error',(err)=>handleError(err))
              socketRef.current.on('connect_failed',(err)=>handleError(err))
              const handleError=(e)=>{
                console.log('socket error=>',e)
                toast.error('socket connection failed')
                navigate('/')
              }
              socketRef.current.emit('join',{
                roomId,
                username:location.state?.username||"guest"
              })
               
             socketRef.current.emit("join",{
              roomId,
              username:location.state?.username,
             })
                
             // eslint-disable-next-line no-unused-vars
             socketRef.current.on('joined', ({ clients, username, socketId }) => {
                    if(username!==location.state?.username)
                    {
                      toast.success(`${username} joined`)
                    }
                    setClient(clients) // displaying all clients in the existing room
                     socketRef.current.emit('sync-code',{
                      code:codeRef.current,
                      socketId
                     })
                  });

          
            // if user is disconnected
            socketRef.current.on("disconnected",({socketId,username})=>{
              toast.success(`${username} leave the room`)
              setClient((prev)=>{ // removing the client room the dashborad
                return prev.filter(
                  (client)=> client.socketId !=socketId 
                )
              })
            })
                       


            }
            init()

            return ()=>{
              socketRef.current.disconnect();
              socketRef.current.off('joined');
              socketRef.current.off('disconnected');
            }
          },[roomId,location.state])
       
        
       // eslint-disable-next-line no-unused-vars
      


      if(!location.state)
      {
        return navigate('/')
      }
         
       const copyRoomId=async()=>{
        try{
                             await navigator.clipboard.writeText(roomId);
                             toast.success("Room id is copied")
        }
        catch(err){
          toast.error("unable to copy room id")
        }
       }
       const leaveRoom=()=>{
        navigate("/")
       }

       // Resizer functionality
       const handleMouseDown = (e) => {
         e.preventDefault();
         isResizing.current = true;
         
         const container = e.currentTarget.closest('.col-md-10');
         if (!container) return;
         
         const handleMouseMove = (e) => {
           if (!isResizing.current) return;
           
           const containerRect = container.getBoundingClientRect();
           const mouseY = e.clientY - containerRect.top;
           const newHeight = Math.max(0, Math.min(70, (containerRect.height - mouseY) / containerRect.height * 100));
           
           if (newHeight <= 3) {
             setTerminalHeight(0);
             setIsTerminalCollapsed(true);
           } else {
             setTerminalHeight(newHeight);
             setIsTerminalCollapsed(false);
           }
         };
         
         const handleMouseUp = () => {
           isResizing.current = false;
           justFinishedResizing.current = true;
           document.removeEventListener('mousemove', handleMouseMove);
           document.removeEventListener('mouseup', handleMouseUp);
           
           // Add a small delay to prevent accidental toggle
           setTimeout(() => {
             justFinishedResizing.current = false;
           }, 150);
         };
         
         document.addEventListener('mousemove', handleMouseMove);
         document.addEventListener('mouseup', handleMouseUp);
       };

       // Function to toggle terminal visibility
       const toggleTerminal = () => {
         // Prevent toggle if we just finished resizing
         if (isResizing.current || justFinishedResizing.current) return;
         
         if (isTerminalCollapsed) {
           setTerminalHeight(30);
           setIsTerminalCollapsed(false);
         } else {
           setTerminalHeight(0);
           setIsTerminalCollapsed(true);
         }
       };

   



  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">

        <div className="col-md-2 bg-dark text-light d-flex flex-column h-100" style={{ boxShadow: "2px 0px 4px rgba(0,0,0.1)" }}>
          
          {/* Title at the top */}
          <h1 className="p-4 text-info" style={{ marginLeft: "7px" }}>Code-along</h1>
          <hr style={{ marginTop: "1rem" }} />
          
          {/* File Tree */}
          <div className="flex-grow-1 overflow-auto">
            <FileTree tree={filetree} onFileSelect={handleFileSelect} />
          </div>

          {/* Client list container */}
          <div className="d-flex flex-column overflow-auto" style={{ maxHeight: "200px" }}>
              {
                clients.map((client)=>(
                  <Client key={client.socketId} username={client.username}/>
                ))
              }
          </div>

          {/* Buttons at the bottom */}
          <div className="mt-auto mb-3">
            <hr/>
            <div className="d-flex flex-column px-2">
              <button onClick={copyRoomId} className="btn btn-success mb-2">Copy Room Id</button>
              <button onClick={leaveRoom} className="btn btn-danger">Leave Room</button>
            </div>
          </div>
        </div>

        {/* Editor and Terminal */}
        <div className="col-md-10 d-flex flex-column h-100">
          {/* Current File Header */}
          <div style={{ 
            backgroundColor: "#2d2d30", 
            color: "#cccccc", 
            padding: "8px 16px", 
            fontSize: "14px",
            borderBottom: "1px solid #444",
            display: "flex",
            alignItems: "center"
          }}>
            <span style={{ marginRight: "8px" }}>📄</span>
            <span>{currentFile || "No file selected"}</span>
          </div>
          
          <div className="flex-grow-1" style={{ height: `${100 - terminalHeight}%`, minHeight: "0", overflow: "hidden" }}>
            <Editor 
              socketRef={socketRef} 
              roomId={roomId} 
              onCodeChange={(code)=>{
                codeRef.current=code 
              }}
              fileContent={fileContent}
              onSaveFile={handleSaveFile}
            />
          </div>
          
          {/* Resizer or Toggle Button */}
          {!isTerminalCollapsed ? (
            <div 
              className="border-top border-bottom" 
              style={{ 
                height: "6px", 
                backgroundColor: "#444", 
                cursor: "row-resize",
                position: "relative",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseDown={handleMouseDown}
            >
              <div 
                style={{
                  width: "40px",
                  height: "3px",
                  backgroundColor: "#888",
                  borderRadius: "2px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                }}
              />
            </div>
          ) : (
            <div 
              className="border-top" 
              style={{ 
                height: "30px", 
                backgroundColor: "#333", 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onClick={toggleTerminal}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#555"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#333"}
            >
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                color: "#ccc",
                fontSize: "12px",
                fontWeight: "500"
              }}>
                <span style={{ marginRight: "8px" }}>▲</span>
                <span>Terminal</span>
              </div>
            </div>
          )}
          
          {!isTerminalCollapsed && (
            <div style={{ height: `${terminalHeight}%`, backgroundColor: "#1e1e1e", minHeight: "0", overflow: "hidden" }}>
              <Terminal currentFile={currentFile} />
            </div>
          )}
        </div>
        
      </div>
          
    </div>
  );
};

export default EditorPage;
