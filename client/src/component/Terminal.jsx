import React, { useEffect, useRef } from 'react'
import {Terminal as XTerminal} from "@xterm/xterm"
import { FitAddon } from '@xterm/addon-fit'
import { initSocket } from '../socket'
import "@xterm/xterm/css/xterm.css";

const Terminal = ({ currentFile }) => {

    const TermRef=useRef()
    const isRendered=useRef(false);
    const terminalRef=useRef(null);
    const fitAddonRef=useRef(null);
    const socketRef=useRef(null);

    const handleRunCode = () => {
        if (socketRef.current && currentFile && currentFile.endsWith('.cpp')) {
            // Clear terminal first
            if (terminalRef.current) {
                terminalRef.current.clear();
            }
            
            // Send compile and run commands
            const fileName = currentFile.replace('.cpp', '');
            const compileCommand = `g++ -o ${fileName} ${currentFile} && ./${fileName}\r`;
            socketRef.current.emit('terminal:write', compileCommand);
        }
    };

    useEffect(()=>{
        if(isRendered.current) return;
        isRendered.current=true;

        const initTerminal = async () => {
            // Initialize socket connection
            socketRef.current = await initSocket();
            
            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;

            const term=new XTerminal({
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                theme: {
                    background: '#1e1e1e',
                    foreground: '#ffffff',
                    cursor: '#ffffff'
                }
            });
            
            term.loadAddon(fitAddon);
            term.open(TermRef.current);
            terminalRef.current = term;
            
            // Fit the terminal to container
            fitAddon.fit();

            // if user is typing on terminal
            term.onData(data=>{
                // console.log(data);
                if (socketRef.current) {
                    socketRef.current.emit('terminal:write', data);
                }
            })

            // Listen for terminal data from server
            if (socketRef.current) {
                socketRef.current.on('terminal:data', (data) => {
                    if (term) {
                        term.write(data);
                    }
                });
            }

            // Resize terminal when container changes
            const resizeObserver = new ResizeObserver(() => {
                if (fitAddon && term) {
                    setTimeout(() => {
                        fitAddon.fit();
                    }, 10);
                }
            });
            
            // Also listen for window resize events
            const handleWindowResize = () => {
                if (fitAddon && term) {
                    setTimeout(() => {
                        fitAddon.fit();
                    }, 10);
                }
            };
            
            window.addEventListener('resize', handleWindowResize);
            
            if (TermRef.current) {
                resizeObserver.observe(TermRef.current);
            }

            return () => {
                resizeObserver.disconnect();
                window.removeEventListener('resize', handleWindowResize);
                if (socketRef.current) {
                    socketRef.current.off('terminal:data');
                    socketRef.current.disconnect();
                }
                term.dispose();
            };
        };

        initTerminal();

    },[])

  return (
    <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column"}}>
      {/* Terminal Header showing current file and run button */}
      <div style={{ 
        backgroundColor: "#1e1e1e", 
        color: "#cccccc", 
        padding: "4px 12px", 
        fontSize: "12px",
        borderBottom: "1px solid #444",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "8px" }}>📁</span>
          <span>~/user/{currentFile || ""}</span>
        </div>
        
        {currentFile && currentFile.endsWith('.cpp') && (
          <button
            onClick={handleRunCode}
            style={{
              backgroundColor: "#007acc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "4px 12px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#005a9e"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#007acc"}
          >
            ▶️ Run Code
          </button>
        )}
      </div>
      
      {/* Terminal Content */}
      <div ref={TermRef} style={{height: "100%", width: "100%", flex: 1}}></div>
    </div>
  )
}

export default Terminal