import { Parser, warning } from "./parser.js";

/**@param {string} html */
export const createCustomElement = ( name, html, extender = {}, watch = [] )=>{
      
      const watched = new Set([
            ...watch, 
            ...Parser.getUsedProperties( html )
      ]);

      class HTMLCustomElement extends HTMLElement {
            static observedAttributes = [...watched.values()];
            /**@type {Object.<string,HTMLElement>} */
            refs = {};
            #alreadyExecuted = false;

            /**@type {ShadowRoot} */
            #shadow;
            #shortcuts = {};
            
            constructor(){
                  super();

                  this.descriptor = Parser.parse( html );
                  this.#shadow = this.attachShadow({ mode: 'open' });
                  this.#shadow.appendChild( 
                        this.descriptor.dom
                  );
                  for( const e of Object.values( this.descriptor.events ) ){
                        const handler = ((ev)=>{
                              e.value.bind(this)(ev);
                              if( e.once ){
                                    e.node.removeEventListener( e.name, handler );
                              }
                        }).bind(this);
                        e.node.addEventListener( e.name, handler );
                  }

                  this.#deepCpyExtenderObj( extender );
                  this.#createReactiveProperties();
                  
            }
            #deepCpyExtenderObj( obj ){
                  if( !obj && typeof obj !== 'object' )
                        return;
                        /*Object.defineProperties( 
                              this,
                              Object.getOwnPropertyDescriptors( extender ),
                        );*/
                  for( const k of Object.keys(obj) ){
                        const d = Object.getOwnPropertyDescriptor( obj, k );
                        
                        if( !('get' in d) && !('set' in d)  && typeof d.value !== 'function' ){
                              Object.defineProperty( 
                                    this,
                                    k,
                                    JSON.parse( JSON.stringify( d ) ),  
                              ); 
                        }else{
                              Object.defineProperty( 
                                    this,
                                    k,
                                    d,  
                              ); 
                        }

                  }
            }
            #createReactiveProperties(){
                  for( const [k,v] of Object.entries( this.descriptor.directBindings ) ){
                        this.#makePropReactive( k );
                        for( const b of v ){
                              b.node.addEventListener( b.event, (()=>{
                                    this[k] = b.node[b.prop];
                              }).bind(this))
                        }
                  }
                  for( const k of Object.keys( this.descriptor.properties ) ){
                        this.#makePropReactive( k );
                  }
                  for( const k of Object.keys( this.descriptor.loopsProperties ) ){
                        if( this.descriptor.loops[k] )
                              continue;
                        this.#makePropReactive( k );
                  }
                  for( const k of HTMLCustomElement.observedAttributes ){
                        if( this.descriptor.loops[k] )
                              continue;
                        this.#makePropReactive( k );
                  }
                  for( const k of Object.keys( this.descriptor.loops ) ){
                        this.#makeArrayReactive( k )
                  }
                  
            }
            #makeArrayReactive( k ){
                  if( this.hasAttribute(`_${k}`) )
                        return;
                  this[`_${k}`] = [];
                  Object.defineProperty( this, k, {
                        get(){
                              return this[`_${k}`];
                        },
                        set( value ){
                              if( !(value instanceof Array) )
                                    return;
                              this[`_${k}`] = value;
                              for( const loop of this.descriptor.loops[k] ){
                                    this.updateLoopNode( loop );
                              }
                        }
                  });
            }
            #makePropReactive( k ){
                  if( Object.getOwnPropertyNames( this ).indexOf( k ) >= 0 )
                        return;
                  this[`_${k}`] = undefined;  
                  Object.defineProperty( this, k, {
                        get(){
                              return this[`_${k}`];
                        },
                        set( value ){
                              if( value == this[`_${k}`] )
                                    return;
                              this[`_${k}`] = value;

                              this.updateProperty( k );

                              if( this.descriptor.directBindings[k] ){
                                    for( const v of this.descriptor.directBindings[k] ){
                                          v.node.setAttribute( v.prop, value );
                                    }
                              }
                              if( this.descriptor.bindings[k] ){
                                    for( const v of Object.values( this.descriptor.bindings[k] ) ){
                                          for( const c of v.copies ){
                                                c.setAttribute( v.prop, value );
                                          }
                                    }
                              }
                        }
                  });  
            }
            #initializeInternalReferences( node ){
                  for( const ref of node.querySelectorAll( `[${Parser.REF_PROPERTY}]` ) ){
                        const k = ref.getAttribute( Parser.REF_PROPERTY );
                        if( this.refs[k] ){
                              continue;
                        }
                        this.refs[k] = ref;
                  }
            }
            connectedCallback(){
                  if( this.onNodeAdded && typeof this.onNodeAdded == 'function' ){
                        this.onBeforeEnter();
                  }
                  this.$emit('before-enter', { target: this });

                  if( !this.#alreadyExecuted ){
                        if( this.hasAttributes() ){
                              for( const attr of this.attributes ){
                                    this[attr.name] = attr.value;
                              }
                        }
                        const newNodeObserver = new MutationObserver(((mutation)=>{
                              this.$emit('node-added', {
                                    nodeList: mutation.addedNodes
                              })
                        }).bind(this));
                        newNodeObserver.observe( this, { childList: true } );
                        this.#initializeInternalReferences( this.descriptor.dom );
                        

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
            setArrayValue( name, value ){
                  if( !this.descriptor.loops[name] || !(value instanceof Array) )
                        return;
                  this[name] = value;
                  for( const loop of this.descriptor.loops[name] ){
                        this.updateLoopNode( loop );
                  }
            }
            #updateHTMLHook( node ){
                  for( const ref of node.querySelectorAll(`[${Parser.REF_PROPERTY}]`) ){
                        const k = ref.getAttribute(Parser.REF_PROPERTY);
                        if( !this.refs[k] ){
                              this.refs[k] = []; 
                        }
                        this.refs[k].push(ref);
                  }
            }
            #updateNodeBinding( node ){
                  for( const ref of node.querySelectorAll(`[${Parser.TWO_WAY_DATA_BINDING}]`) ){
                        const data = ref.getAttribute( Parser.TWO_WAY_DATA_BINDING );
                        const k = ref.getAttribute( this.descriptor.bindingKey );
                        const descriptor = this.descriptor.bindings[ data ][ k ];
                        descriptor.copies.push( ref );
                        ref.addEventListener( descriptor.event, (()=>{
                              this[data] = ref[descriptor.prop];
                        }).bind(this));
                  }
            }
            #addHTMLHook( node, i ){
                  this.#updateHTMLHook( node );
                  this.#updateNodeBinding( node );
                  
                  for( const el of node.querySelectorAll(`.${this.descriptor.condKey}`) ){
                        const descriptor = this.descriptor.idCondMap[ el.getAttribute( this.descriptor.key ) ];
                        this.#addHTMLHook( descriptor.copies[i].ifCpy, i );
                        if( !descriptor.copies[i].elseCpy )
                              continue;
                        this.#addHTMLHook( descriptor.copies[i].elseCpy, i );
                  }
            }
            /**create list filled with duplicates of model and scope */
            #createLoopList( model, variable, scope ){
                  const list = [];
                  for( const el of this[variable] ){
                        list.push({
                              root: model.cloneNode(true),
                              scope: [...scope, el],
                        });
                        //this.#addHTMLHook( list[ list.length - 1 ].root );
                  }
                  return list;
            }
            #duplicateConditionalTag( cRoot, key, scope, variable ){
                  const descriptor = this.descriptor.idCondMap[ key ];
                  let i = descriptor.copies.length;

                  if( i > this[variable].length ){
                        descriptor.copies = [];
                        i = 0;
                  }

                  descriptor.copies.push({
                        root: cRoot,
                        scope: [...scope, this[variable][i]],
                        ifCpy: descriptor.ifNode.cloneNode( true ),
                        elseCpy: descriptor.elseNode? 
                                    descriptor.elseNode.cloneNode( true ):
                                    undefined,
                  });
                  cRoot.innerHTML = '';
                  if( descriptor.condition.bind(this)(...scope, this[variable][i]) ){
                        cRoot.appendChild( descriptor.copies[ descriptor.copies.length - 1 ].ifCpy );
                  }else if( descriptor.elseNode ){
                        cRoot.appendChild( descriptor.copies[ descriptor.copies.length - 1 ].elseCpy );   
                  }
                  for( const r of descriptor.copies[ descriptor.copies.length - 1 ].ifCpy.querySelectorAll(`.${this.descriptor.condKey}`) ){
                        this.#duplicateConditionalTag( r, r.getAttribute( this.descriptor.key ), scope, variable );
                  }
                  if( !descriptor.copies[ descriptor.copies.length - 1 ].elseCpy )
                        return;
                  for( const r of descriptor.copies[ descriptor.copies.length - 1 ].elseCpy.querySelectorAll(`.${this.descriptor.condKey}`) ){
                        this.#duplicateConditionalTag( r, r.getAttribute( this.descriptor.key ), scope, variable );
                  }
            }
            #appendConditionalTags( model, list, scope, variable ){
                  if( !model.querySelector(`.${this.descriptor.condKey}`) ){
                        return;
                  }

                  for( const el of model.querySelectorAll(`.${this.descriptor.condKey}`) ){
                        this.descriptor.idCondMap[ el.getAttribute( this.descriptor.key ) ].copies = [];
                  }
                  for( const el of list ){
                        const cond = el.root.querySelectorAll(`.${this.descriptor.condKey}`);
                        for( const c of cond ){
                              this.#duplicateConditionalTag( 
                                    c, 
                                    c.getAttribute( this.descriptor.key ), 
                                    scope, 
                                    variable 
                              );
                        }
                  }
            }
            /**
             * 
             * @param {*} list 
             * @param {*} key 
             * @param {*} descriptor 
             */
            #getDuplicateReferenceByKey( list, key, descriptor ){
                  if( this.descriptor.conditionalRefSet[key] ){
                        for( const n of this.descriptor.idCondMap[this.descriptor.conditionalRefSet[key]].copies ){
                              let copyRoot = n.ifCpy.querySelector(`[${this.descriptor.key}="${key}"]`);
                              if( !copyRoot ){
                                    copyRoot = n.elseCpy.querySelector(`[${this.descriptor.key}="${key}"]`);
                              }
                              descriptor.copies.push({
                                    root: copyRoot,
                                    scopeValues: n.scope,
                              });
                              
                        }
                        return;
                  }
                  for( const n of list ){
                        /**@type {HTMLElement} */
                        const copyRoot = n.root.querySelector(`[${this.descriptor.key}="${key}"]`);
                        descriptor.copies.push({
                              root: copyRoot,
                              scopeValues: n.scope,
                        });
                  }
            }
            /**
             * 
             * @param {HTMLElement} root 
             * @param {{scope: any[], root: HTMLElement}[]} list 
             */
            #addEventsToLoop( list, root ){
                  const events = [];
                  for( const l of list ){
                        for( const eventNode of l.root.querySelectorAll(`[${this.descriptor.eventsKey}]:not([if],[else])`) ){
                              events.push({
                                    node: eventNode,
                                    k: eventNode.getAttribute(this.descriptor.eventsKey),
                                    scope: l.scope,
                              });
                        }
                  }
                  for( const cond of Object.values(this.descriptor.idCondMap) ){
                        for( const cpy of cond.copies ){
                              if( !root.contains(cpy.ifCpy) ){
                                    for( const eventNode of cpy.ifCpy.querySelectorAll(`[${this.descriptor.eventsKey}]`) ){
                                          events.push({
                                                node: eventNode,
                                                k: eventNode.getAttribute(this.descriptor.eventsKey),
                                                scope: cpy.scope,
                                          });
                                    }
                              }
                              if( !cpy.elseCpy && !root.contains(cpy.elseCpy) )
                                    continue;
                              for( const eventNode of cpy.elseCpy.querySelectorAll(`[${this.descriptor.eventsKey}]`) ){
                                    events.push({
                                          node: eventNode,
                                          k: eventNode.getAttribute(this.descriptor.eventsKey),
                                          scope: cpy.scope,
                                    });
                              } 
                        }
                  }
                  for( const {k, node, scope} of events ){
                        const eVec = this.descriptor.eventsMap[k];
                        for( const ev of eVec ){
                              const handler = ((e)=>{
                                    ev.value.bind(this)(...scope, e);
                                    if( ev.once ){
                                          node.removeEventListener( ev.name, handler );
                                    }
                              }).bind(this);
                              node.addEventListener( ev.name, handler );
                        }     
                  }
            }
            /**
             * 
             * @param {*} root 
             * @param {{scope: any[], root: HTMLElement}[]} list 
             */
            #appendList( root, list ){
                  root.innerHTML = '';
                  for( const l of list ){
                        root.appendChild( l.root );
                  }
            }
            #updateDuplicatedProperties( queue ){
                  for( const n of queue ){
                        if( n.isFor ){
                              this.updateLoopNode( n.descriptor );
                        }else{
                              
                              for( const c of n.descriptor.copies ){
                                    if( !c.root )
                                          continue;
                                    if( !n.descriptor.isAttribute ){
                                          c.root.innerHTML = n.descriptor.value.bind(this)(...c.scopeValues);
                                    }else{
                                          c.root.setAttribute( n.descriptor.attributeName, n.descriptor.value.bind(this)(...c.scopeValues) )
                                    }
                              }
                        }
                  }
            }
            #addHTMLUserHooks( list ){
                  for( let i = 0; i < list.length; i++ ){
                        this.#addHTMLHook( list[i].root, i );
                  }
            }
            #loopUpdate( root, model, variable, scope, linkedProps ){

                  const list = this.#createLoopList( model, variable, scope );
                  const queue = [];
                  
                  this.#appendConditionalTags( model, list, scope, variable );
                  this.#addHTMLUserHooks( list );
                  
                  for( const linkToProp of linkedProps ){
                        this.#getDuplicateReferenceByKey( list, linkToProp.key, linkToProp.descriptor );
                        queue.push( linkToProp );
                  }
                  this.#updateDuplicatedProperties( queue );
                  this.#appendList( root, list );
                  this.#addEventsToLoop( list, root );
            }
            /**
            * @private
            * @param {import("./parser.js").LoopDescriptor} node  
            */
            updateLoopNode( node ){

                  if( node.copies <= 0 ){
                        for( const ref of node.rootNode.querySelectorAll(`[${Parser.REF_PROPERTY}]`) ){
                              this.refs[ref.getAttribute(Parser.REF_PROPERTY)] = [];
                        }
                        for( const ref of node.rootNode.querySelectorAll(`[${Parser.TWO_WAY_DATA_BINDING}]`) ){
                              const data = ref.getAttribute(Parser.TWO_WAY_DATA_BINDING);
                              const k = ref.getAttribute(this.descriptor.bindingKey);
                              this.descriptor.bindings[data][k].copies = [];
                        }
                        this.#loopUpdate( 
                              node.rootNode, 
                              node.model, 
                              node.variable, 
                              [], 
                              node.refs 
                        );
                  }else{
                        for( const ref of node.refs ){
                              ref.descriptor.copies = [];
                        }
                        if( node.copies.length > 0 ){
                              for( const ref of node.copies[0].root.querySelectorAll(`[${Parser.REF_PROPERTY}]`) ){
                                    this.refs[ref.getAttribute(Parser.REF_PROPERTY)] = [];
                              }
                              for( const ref of node.copies[0].querySelectorAll(`[${Parser.TWO_WAY_DATA_BINDING}]`) ){
                                    const data = ref.getAttribute(Parser.TWO_WAY_DATA_BINDING);
                                    const k = ref.getAttribute(this.descriptor.bindingKey);
                                    this.descriptor.bindings[data][k].copies = [];
                              }
                        }
                        for( const copy of node.copies ){
                              this.#loopUpdate( 
                                    copy.root, 
                                    node.model, 
                                    node.variable, 
                                    copy.scopeValues, 
                                    node.refs 
                              );
                        }
                  }
            }
            /**
            * @private
            */
            updateProperty( name ){
                  if( this.descriptor.properties[ name ] ){
                        for( const prop of this.descriptor.properties[ name ] ){
                              if( prop.isAttribute ){
                                    prop.rootNode.setAttribute( prop.attributeName, prop.value.bind(this)() );
                              }else{
                                    prop.rootNode.innerHTML = prop.value.bind(this)();
                              }
                        }
                  }
                  if( this.descriptor.loopsProperties[ name ] ){
                        for( const prop of this.descriptor.loopsProperties[ name ] ){
                              if( prop.isAttribute ){
                                    for( const n of prop.copies ){
                                          n.root.setAttribute( prop.attributeName, prop.value.bind(this)(...n.scopeValues) );
                                    }
                              }else{
                                    for( const n of prop.copies ){
                                          n.root.innerHTML = prop.value.bind(this)(...n.scopeValues);
                                    }
                              }
                        }
                  }
                  if( this.descriptor.conditionals[ name ] ){
                        for( const cond of this.descriptor.conditionals[ name ] ){
                              if( cond.copies && cond.copies.length > 0 ){
                                    for( const c of cond.copies ){
                                          const flag = cond.condition.bind(this)(c.scope);
                                          
                                          c.root.innerHTML = '';
                                          if( flag ){
                                                c.root.appendChild( c.ifCpy );
                                          }else if( c.elseCpy ){
                                                c.root.appendChild( c.elseCpy );
                                          }
                                    }
                              }else{
                                    const flag = cond.condition.bind(this)();
                                    cond.root.innerHTML = '';
                                    if( flag ){
                                          cond.root.appendChild( cond.ifNode );
                                    }else if( cond.elseNode ){
                                          cond.root.appendChild( cond.elseNode );
                                    }
                              }
                        }
                  }
            }
            $emit( eventName, eventData ){
                  this.dispatchEvent( new CustomEvent( eventName, {detail: eventData} ) );
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