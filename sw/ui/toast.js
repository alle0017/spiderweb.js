import { define } from '../../api.js';

define({
      name: 'sw-toast',
      template: /*html*/`
            <div if="this.backdrop" id="backdrop" ref="_b"></div>
            <div id="toast-wrapper" ref="_toast">
                  <slot></slot>
            </div>
            <style>
                  :host { 
                        --padding: 5%;
                        --width: 100px;
                        --height: 10px;
                        --left: 20%;
                        --top: 0%;
                        --background-color: #46b5ffaa;
                        --color: #000;
                        --border: 2px solid #0072be;
                        --border-radius: 5px;
                        --backdrop-color: #000c;
                        --min-width: var(--width);
                        --min-height: var(--height);
                  }
                  #toast-wrapper {
                        width: var(--width); 
                        height: var(--height);
                        min-width: var(--min-width); 
                        min-height: var(--min-height);
                        left: var(--left);
                        top: var(--top);
                        position: fixed;
                        border-radius: var(--border-radius);
                        border: var(--border);
                        background-color: var(--background-color);
                        padding: var(--padding);
                        display: none;
                  }
                  #backdrop {
                        display: none;
                        background-color: var(--backdrop-color);
                        width: 100vw;
                        height: 100vh;
                        position: fixed;
                        left: 0;
                        top: 0;
                  }
            </style>
      `,
      props: {
            _attached: false,
            root: document.body,
            backdrop: false,
            show(){
                  if( this._attached )
                        return;
                  this._attached = true;
                  this.refs._toast.style.display = 'block';
                  this.refs._b && (this.refs._b.style.display = 'block');
            },
            dismiss(){
                  if( !this._attached )
                        return;
                  this._attached = false;
                  this.refs._toast.style.display = 'none';
                  this.refs._b && (this.refs._b.style.display = 'none');
            },
            showFor( ms ){
                  this.show();
                  setTimeout( (()=>{
                        this.dismiss();
                  }).bind(this), ms );

            },
      }
});