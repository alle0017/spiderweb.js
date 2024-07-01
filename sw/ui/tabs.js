import { define } from '../../api.js';
import { warning } from '../parser.js';

define({
      name: 'sw-tabs',
      template: /*html*/`
            <ul role="menu" id="--menu">
                  <li for="panel of _titleBar" class="--li" role="menu-button">
                        <span ref="_template" @click="this._change(panel.index, $e)" class="btn">
                              {{ panel.title }}
                        </span>
                  </li>
            </ul>
            <div id="sw-root"><slot ref="_root" name="display"></slot></div>
            <style>
                  :host {
                        --width: 200px;
                        --height: 300px;
                        --menu-button-width: 130px;
                        --menu-button-height: 30px;
                        --menu-button-color: #000;
                        --menu-button-hover-color: #ccce;
                        --menu-button-underline: #000;
                  }
                  #sw-root {
                        min-width: var(--width);
                        min-height: var(--height);
                        display: block;
                  }
                  #--menu{
                        padding-bottom: 100px;
                  }
                  .btn {
                        min-width: var(--menu-button-width);
                        min-height: var(--menu-button-height);
                        padding-right: 50px;
                        padding-top: 1%;
                        padding-bottom: 1%;
                  }
                  ul {
                        list-style: none;
                  }
                  li {
                        float: left;
                        width: var(--menu-button-width);
                        height: var(--menu-button-height);
                        color: var(--menu-button-color);
                        padding-top: 1%;
                        padding-left: 2%;
                        border-bottom: 0.5px solid var(--menu-button-underline);
                  }
                  .--underline {
                        border-bottom: 2px solid var(--menu-button-underline);
                  }
                  li:hover{
                        background-color: var(--menu-button-hover-color);
                  }
            </style>
      `,
      watched: ['underline'],
      props: {
            _tabs: [],
            _curr: 0,
            _roots: [],
            _old: null,
            underline: true,
            _change(index, e){
                  if( this._curr === index )
                        return;
                  this.$emit( 'change', {
                        oldId: this._curr,
                        id: index,
                  });
                  this._curr = index;
                  //this.refs._root.assign( this._tabs[index] );
                  this._tabs[index].slot = 'display';
                  this.replaceChildren( this._tabs[index] );
                  this.refs._root.ariaSelected = this._titleBar[index].title;
                  
                  if( this.underline ){
                        this._old && this._old.classList.remove('--underline');
                        this._old = e.target.parentElement;
                        while( this._old && !this._old.classList.contains('--li') )
                              this._old = this._old.parentElement;
                        this._old.classList.add('--underline');
                  }
            },

            _updateMenu(){
                  let i = 0;
                  this._titleBar = this._titleBar;

                  for( const node of this._roots ){
                        if( !node.root && !this.refs._template[ node.index ]){
                              this._roots.splice( i, 1 );
                        }
                        this.refs._template[ node.index ].replaceChildren( node.root );
                        i++;
                  }
                  return 1;
            },

            onenter(){
                  const list = [];

                  if( this._tabs.length > 0 )
                        return;

                  for( const n of this.childNodes ){
                        if( n.nodeName.toLowerCase() === 'tab-panel' )
                              list.push( n );
                  }
                  

                  if( !list.length )
                        return;

                  let i = 0;
                  for( const tab of list ){
                        this._tabs.push( tab );

                        const title = tab.getAttribute('title');
                        const menuId = tab.getAttribute('menu-id');

                        if( title ){
                              this._titleBar.push({
                                    title: title,
                                    index: i,
                              })
                        }else if( menuId ){
                              const root = this.querySelector(`#${menuId}`);
                              this._titleBar.push({
                                    index: i,
                                    root,
                                    title: `tab${i+1}`,
                              });
                              this._roots.push( this._titleBar[ this._titleBar.length - 1 ] );
                              root && root.remove();
                        }else{
                              this._titleBar.push({
                                    title: `tab${i+1}`,
                                    index: i,
                              });
                        }
                        i++;
                  }
                  this._updateMenu();
                  //this.refs._root.assign( this._tabs[0] );
                  this._tabs[0].slot = 'display'
                  this.replaceChildren( this._tabs[0] );
            },


            addTab( tab, title = 'tab' ){
                  if( !tab || typeof tab !== 'object' || !(tab instanceof HTMLElement) ){
                        warning('Tab must be an HTML element');
                        return;
                  }
                  
                  this._tabs.push( tab );
                  this._titleBar.push({
                        title: title || 'tab',
                        index: this._titleBar.length, 
                  });
                  if( title instanceof HTMLElement ){
                        const last = this._titleBar[this._titleBar.length - 1];
                        last.root = title;
                        this._roots.push(last);
                  }
                  this._updateMenu();
            },


            removeTab( index ){
                  if( index < 0 || index >= this._tabs.length ){
                        warning('Tab index out of bounds');
                        return;
                  }
                  if( index == this._curr && index > 0 ){
                              this._change( index - 1 );
                  }else if( index == this._curr && !index ){
                        this._change( index + 1 );
                  }
                  this._tabs.splice( index, 1 );
                  const [ref] = this._titleBar.splice( index, 1 );
                  const i = this._roots.indexOf(ref);
                  i >= 0 && this._roots.splice( i, 1 )

                  while( this._titleBar.length > index ){
                        this._titleBar[index].index = index;
                        index++;
                  }
                  this._updateMenu();
            }
      }
})
