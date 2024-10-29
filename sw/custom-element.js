//import { Parser, warning } from "./parser.js";
import { Parser, warning } from "./compiler.js";
import HTMLReactiveElement from "./html-reactive-element.js";

/**
 * @param {string} name
 * @param {string} html 
 * @param {Object} extender,
 * @param {string[]} watch
 */
export const createCustomElement = ( name, html, extender = {}, watch = [] )=>{

      const parser = new Parser();
      const cloneable = parser.createReactiveCloneable( html );


      for( let i=0; i < watch.length; i++ ){
            cloneable.usedProperties.add( watch[ i ] );
      }


      class HTMLCustomElement extends HTMLReactiveElement( name, [...cloneable.usedProperties.values()], extender, cloneable ) {
            

            /**@type {Object.<string,HTMLElement>} */
            refs = {};
            #alreadyExecuted = false;

            #shortcuts = {};
            
            constructor(){
                  super();
            }

            onenter(){}
            onleave(){}
            onBeforeEnter(){}
            setup(){}
            onNodeAdded( nodes ){}

            connectedCallback(){
                  if( this.onBeforeEnter && typeof this.onBeforeEnter == 'function' ){
                        this.onBeforeEnter();
                  }
                  this.$emit('before-enter', { target: this });

                  if( !this.#alreadyExecuted ){
                        super.connectedCallback();

                        const newNodeObserver = new MutationObserver((/**@type {MutationRecord}*/(mutation)=>{
                              if( !mutation.addedNodes )
                                    return;
                              this.$emit('node-added', {
                                    nodeList: mutation.addedNodes
                              })
                              if( this.onNodeAdded && typeof this.onNodeAdded == 'function' ){
                                    this.onNodeAdded( mutation.addedNodes );
                              }
                        }).bind(this));
                        newNodeObserver.observe( this, { childList: true } );
                        
                        

                        if( this.setup && typeof this.setup == 'function' ){
                              this.setup();
                        }
                        this.$emit('setup', { target: this });

                        this.#alreadyExecuted = true;
                  }
                  
                  if( this.onenter && typeof this.onenter == 'function' ){
                        this.onenter();
                  }
                  this.$emit('enter', { target: this });
            }
            disconnectedCallback(){
                  if( this.onleave && typeof this.onleave == 'function' ){
                        this.onleave();
                  }
                  this.$emit('leave', { target: this });
            }
            attributeChangedCallback( name, oldValue, newValue ){
                  if( oldValue == newValue )
                        return;
                  this[name] = newValue;
                  this.updateProperty( name );
            }
            $emit( eventName, eventData, bubbles = true, crossComponent = true ){
                  this.dispatchEvent( new CustomEvent( eventName, {
                        bubbles,
                        composed: crossComponent,
                        detail: eventData,
                  }));
            }
            addShortcut( callback, ...keys ){
                  const stack = ['Meta'];
                  keys = keys.filter( v => typeof v === 'string' );

                  if( keys.length <= 0 ){
                        warning( 'No valid keys found for the shortcut' );
                        return;
                  }
                  const shortcutKey = keys.reduce( (p,k)=>  p + k );
                  let metaPressed = false;

                  if( this.#shortcuts[ shortcutKey ] ){
                        warning( 'Shortcut already in use, it will be overwritten' );
                        this.removeShortcut( ...keys );
                  }

                  this.#shortcuts[ shortcutKey ] = {
                        up: (e =>{
                              if( e.key == 'Meta' ){
                                    metaPressed = false;
                              }
                              while( (stack.length > 2 && metaPressed) || (stack.length > 1 && !metaPressed) ){
                                    stack.pop();
                              }
                        }).bind(this),
                        down: (e =>{
                              if( e.key == 'Meta' )
                                    metaPressed = true;
                              if( e.key == stack[stack.length - 1] && keys.length >= stack.length ){
                                    stack.push( keys[ stack.length - 1 ] );
                              }else if( e.key == stack[stack.length - 1] ){
                                    callback();
                              }
                        }).bind(this)
                  }
                  document.body.addEventListener( 'keydown', this.#shortcuts[ shortcutKey ].down );
                  document.body.addEventListener( 'keyup', this.#shortcuts[ shortcutKey ].up );
            }
            removeShortcut(  ...keys ){
                  keys = keys.filter( v => typeof v === 'string' );

                  if( keys.length <= 0 ){
                        warning( 'No valid keys found for the shortcut' );
                        return;
                  }
                  const shortcutKey = keys.reduce( (p,k)=>  p + k );
                  if( !this.#shortcuts[ shortcutKey ] ){
                        warning( 'Shortcut not found' );
                        return;
                  }
                  document.body.removeEventListener( 'keyup', this.#shortcuts[ shortcutKey ].up );
                  document.body.removeEventListener( 'keydown', this.#shortcuts[ shortcutKey ].down );
            }
      }

      customElements.define( name, HTMLCustomElement );
}



/**
 * @typedef {Object} CustomProperties
 * @property  $emit {( eventName: string, eventData: string)=>void} emit new event of type eventName. the event object will have the eventData object inside the data property
 * @property refs {Object.<string, HTMLElement | HTMLElement[]>} Collection of references to html elements that lives inside the component.The elements that are also child of loops will be referenced as an array of reference. The elements that are child of conditional tag will not be added to refs
 * @property addShortcut {( callback: function, ...keys: Array<string>)=> void} Add a global shortcut
 * @property removeShortcut {(...keys: Array<string>)=> void} Remove a global shortcut previously added
 * @property onenter {()=> void} event fired each time the element is appended to the dom
 * @property onleave {()=> void} event fired each time the element is removed from the dom
 * @property setup {()=> void} event fired only the first time the element is appended. Important Note: this event is a particular case of the onenter event, but is called before it.
 * @property onBeforeEnter {()=> void} event fired before the element is appended. Important Note: when this event is fired the first time, the references to all the properties, refs etc... are not settled yet.
 * @property onNodeAdded {( event: { data: { nodeList: HTMLElement[] } })=> void} event fired when child nodes are appended to the custom element.
 * 
 * 
 * @typedef {CustomProperties & HTMLElement} HTMLCustomElement
 */