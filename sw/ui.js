import { define } from '../api.js';

define({
      name: 'sw-breadcrumb',
      template: /*html*/`
            <ul>
                  <li for="el of elements">
                        <span @click="el.handler && el.handler(); this.select && this._select($e);">
                              <img if="el.icon" src="{{el.icon}}"/>
                              {{el.name || ''}}{{this.separator || '>'}}
                        </span> 
                  </li>
            </ul>
            <style>
                  :host{
                        --bg-color: none;
                        --color: #000;
                        --font-size: 18px;
                        --font-family: 'Courier New', Courier, monospace;
                  }
                  ul {
                        list-style: none;
                  }
                  li {
                        background-color: var(--bg-color);
                        color: var(--color);
                        font-size: var(--font-size);
                        font-family: var(--font-family);
                        float: left;
                  }
                  li:hover {
                        filter: brightness(50%);
                        font-weight: bold;
                  }
            </style>
      `,
      props: {
            select: true,
            _lastSelected: undefined,
            _select( e ){
                  console.log(e)
                  if( this._lastSelected ){
                        this._lastSelected.style.fontWeight = 'unset';
                  }
                  e.target.style.fontWeight = 'bold';
                  this._lastSelected = e.target;
            }
      }
});

define({
      name: 'sw-toast',
      template: /*html*/`
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
                  }
                  #toast-wrapper {
                        width: var(--width); 
                        height: var(--height);
                        min-width: var(--width); 
                        min-height: var(--height);
                        left: var(--left);
                        top: var(--top);
                        position: fixed;
                        border-radius: var(--border-radius);
                        border: var(--border);
                        background-color: var(--background-color);
                        padding: var(--padding);
                        display: none;
                  }
            </style>
      `,
      props: {
            _attached: false,
            root: document.body,
            show(){
                  if( this._attached )
                        return;
                  this._attached = true;
                  this.refs._toast.style.display = 'block';
            },
            dismiss(){
                  if( !this._attached )
                        return;
                  this._attached = false;
                  this.refs._toast.style.display = 'none';
            },
            showFor( ms ){
                  this.show();
                  setTimeout( (()=>{
                        this.dismiss();
                  }).bind(this), ms );

            },
      }
});
