import { define } from '../../api.js';
import { warning } from '../parser.js';

define({
      name: 'sw-code',
      template: /*html*/`
            <textarea disabled="true" ref="textarea">
            </textarea>
            <style>
                  :host {
                        --bg-color: #aaa;
                        --color: #00aac8;
                        --padding: 5%;
                        --width: 80vw;
                        --height: 400px;
                  }
                  @media (prefers-color-scheme: dark) {
                        :host {
                              --bg-color: #1c1c1c;
                              --color: #00aac8;
                        }
                  }
                  textarea {
                        background-color: var(--bg-color);
                        color: var(--color) !important;
                        resize: none;
                        padding: var(--padding);
                        width: var(--width);
                        height: var(--height);
                  }
            </style>
      `,
      props: {
            _str: '',
            onenter(){
                  if( !this.hasChildNodes() ){
                        warning('no code to escape found inside sw-code tag');
                        return;
                  }

                  this._str = this.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  this.innerHTML = '';
                  this.refs.textarea.innerHTML = this._str;
            }
      }
});