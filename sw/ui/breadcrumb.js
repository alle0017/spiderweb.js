import { define } from '../../api.js';

define({
      name: 'sw-breadcrumb',
      template: /*html*/`
            <ul>
                  <li for="el of menuElements">
                        <span @click="el.handler && el.handler(); this.select && this._select($e);">
                              <img if="el.icon" src="{{el.icon}}"/>
                              {{el.name || ''}}{{this.separator || '>'}}
                        </span> 
                  </li>
            </ul>
            <style>
                  :host{
                        --menu-button-bg-color: none;
                        --menu-button-color: #000;
                  }
                  ul {
                        list-style: none;
                  }
                  li {
                        background-color: var(--menu-button-bg-color);
                        color: var(--menu-button-color);
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
                  if( this._lastSelected ){
                        this._lastSelected.style.fontWeight = 'unset';
                  }
                  e.target.style.fontWeight = 'bold';
                  this._lastSelected = e.target;
            },
      }
});