import { Parser } from "./parser.js";
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

            /**@type {ShadowRoot} */
            #shadow;
            constructor(){
                  super();


                  this.descriptor = Parser.parse( html );
                  this.#shadow = this.attachShadow({ mode: 'open' });
                  this.#shadow.appendChild( 
                        this.descriptor.dom
                  );
                  for( const e of this.descriptor.events ){
                        const handler = ((ev)=>{
                              e.value.bind(this)(ev);
                              if( e.once ){
                                    e.node.removeEventListener( e.name, handler );
                              }
                        }).bind(this);
                        e.node.addEventListener( e.name, handler );
                  }
                  this.#createReactiveProperties();
                  if( extender && typeof extender == 'object' ){
                        for( const [k,v] of Object.entries( extender ) ){
                              if( this[k] ){
                                    warning( `property ${k} already exists in ${name}. The redefinition is ignored` );
                                    continue;
                              }
                              this[k] = v;
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
                              warning( `reference named ${k} already exists in ${name}. The redefinition is ignored` );
                              continue;
                        }
                        this.refs[k] = ref;
                  }
            }
            connectedCallback(){
                  if( this.hasAttributes() ){
                        for( const attr of this.attributes ){
                              this[attr.name] = attr.value;
                        }
                  }
                  this.#initializeInternalReferences( this.descriptor.dom );
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
                                    c.root.innerHTML = n.descriptor.value.bind(this)(...c.scopeValues);
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
                                    }else if( cond.conditionals[ name ].elseNode ){
                                          cond.conditionals[ name ].root.appendChild( cond.conditionals[ name ].elseNode );
                                    }
                              }
                        }
                  }
            }
            
      }
      customElements.define( name, HTMLCustomElement );
}