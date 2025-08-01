/* eslint-disable react-hooks/exhaustive-deps */
import { useRef,useEffect } from "react";
import "codemirror/mode/clike/clike";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";

// eslint-disable-next-line react/prop-types
const Editor = ({socketRef,roomId,onCodeChange,fileContent,onSaveFile}) => {
    // eslint-disable-next-line no-unused-vars
    const editorRef=useRef(null);
    

    useEffect(()=>{
        const init=async()=>{
                         const editor=CodeMirror.fromTextArea(
                         document.getElementById("realTimeEditor"),
                            {
                                mode:"text/x-c++src",
                                theme:"dracula",
                                autoCloseTags:true,
                                autoCloseBrackets:true,
                                lineNumbers:true,
                            }


                         );
                         editorRef.current=editor;
                         editor.setSize(null,'100%')
                      editor.on('change',(instance,changes)=>{
                         const {origin}=changes;
                         const code=instance.getValue();      // code that is being getting written on the code-mirror
                            
                         onCodeChange(code)
                         
                         // Auto-save file content if onSaveFile is provided
                         if(onSaveFile && origin !== "setValue") {
                           onSaveFile(code);
                         }
                         
                         if(origin!=="setValue")
                          {
                            // eslint-disable-next-line react/prop-types
                            socketRef.current.emit("code-change",{
                              roomId,
                              code,
                            });
                          }
                      
                          })
                        
                          // eslint-disable-next-line react/prop-types
                         

                        }
                        init();
    },)
    useEffect(()=>{
      // eslint-disable-next-line react/prop-types
      if(socketRef.current)
      {
        // eslint-disable-next-line react/prop-types
        socketRef.current.on('code-change',({code})=>{
          if(code!=null)
          {
            editorRef.current.setValue(code);
          }
        })
      }
      return ()=>{
        socketRef.current.off("code-change");
      }
    // eslint-disable-next-line react/prop-types
    },[socketRef.current])

    // Update editor content when fileContent prop changes
    useEffect(() => {
      if(editorRef.current && fileContent !== undefined) {
        editorRef.current.setValue(fileContent || '');
      }
    }, [fileContent]);

  return (
    <div style={{height:"100%", overflow: "hidden"}}>
        <textarea id="realTimeEditor" style={{width: "100%", height: "100%"}}></textarea>
    </div>
  )
}

export default Editor

