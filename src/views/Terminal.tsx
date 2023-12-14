import {useRef, useEffect} from 'react';
import ShellInABox from '../services/shellinabox'
import './terminal.css';


class Dispatcher {
  socket: any
  shell: any
  constructor(container: any) {
    const id = window.location.pathname.split('/').at(-1);
    
    this.socket = new WebSocket("ws://127.0.0.1:80/ws/terminal/"+id);

    this.socket.addEventListener("open", (event: any) => {
      this.shell = new ShellInABox(this, 'shellinabox', container);
    });

    this.socket.addEventListener("message", (event: any) => {
      const obj = JSON.parse(event.data);
      console.log(obj);
      this.shell.onReadyStateChange(eval('("' + obj.data + '")'))
    });
  }

  openTerminal(size: any) {
    console.log(size)
    const openMessage = {
      action: 'open',
      session: "randomid",
      width: size.width,
      height: size.height,
      data: ''
    }
    this.socket.send(JSON.stringify(openMessage));
  }

  sendKeys(terminalEvent: any) {
    const keyEventMessage = {
      action: 'key',
      session: "randomid",
      width: terminalEvent.width,
      height: terminalEvent.height,
      data: terminalEvent.keys
    }
    this.socket.send(JSON.stringify(keyEventMessage));
  }
}

export const Terminal = () => {
  const ref = useRef(null);

  const disp = new Dispatcher(ref.current);


  return (
    <>
      <div ref={ref} id="vt100" className="terminalContainer"></div>
    </>
  );
};
export default Terminal;
