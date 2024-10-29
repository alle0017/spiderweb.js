import { Parser } from "./compiler.js";
import Cloner from "./cloner.js";

/**
 * @param {string} name
 * @param {Object} extender
 * @param {string[]} watched 
 * @param {ReactiveCloneable} cloneable
 * @returns 
 */
const HTMLReactiveElement = ( name, watched, extender, cloneable ) =>{
      //console.log( watched );
      return class C extends HTMLElement {
            
            static observedAttributes = watched;

            /**@type {Object.<string,HTMLElement | HTMLElement[]>} */
            refs = {};

            /**
             * @private
             * @readonly
             * @type {ReactiveProperties} 
             */
            descriptor;

            /**@type {ShadowRoot} */
            #shadow;

            /**
             * @param {ExternRef} x 
             * @returns { x is  { isFor: true, descriptor: Ref<LoopDescriptor>, key: number,}}
             */
            static #isRefToLoop = x => x.isFor;
            
            constructor(){
                  super();

                  this.descriptor = new Cloner( cloneable ).clone( this );

                  this.#shadow = this.attachShadow({ mode: 'open' });
                  this.#shadow.appendChild( 
                        this.descriptor.dom
                  );

                  this.#deepCpyExtenderObj( extender );
                  this.#createReactiveProperties();
                  
            }

            /**
             * 
             * @param {Object} obj 
             * @returns 
             */
            #deepCpyExtenderObj( obj ){
                  if( !obj && typeof obj !== 'object' )
                        return;

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
                  for( const [k,v] of this.descriptor.directBindings.entries() ){
                        this.#makePropReactive( k );
                        for( const b of v ){
                              b.rootNode.addEventListener( b.event, (()=>{
                                    this[k] = b.rootNode[b.prop];
                              }).bind(this))
                        }
                  }
                  for( const k of this.descriptor.properties.keys() ){
                        this.#makePropReactive( k );
                  }
                  for( const k of this.descriptor.loopsProperties.keys() ){
                        if( this.descriptor.loops.has( k ) )
                              continue;
                        this.#makePropReactive( k );
                  }

                  for( const k of C.observedAttributes ){
                        if( this.descriptor.loops.has( k ) )
                              continue;
                        this.#makePropReactive( k );
                  }

                  for( const k of this.descriptor.loops.keys() ){
                        this.#makeArrayReactive( k )
                  }
                  
            }
            /**
             * 
             * @param {string} k 
             * @returns 
             */
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
                              const loops = this.descriptor.loops.get( k );
                              for( let i = 0; i < loops.length; i++  ){
                                    this.updateLoopNode( loops[i] );
                              }
                        }
                  });
            }
            /**
             * 
             * @param {string} k 
             */
            #makePropReactive( k ){
                  if( Object.getOwnPropertyNames( this ).indexOf(`_${k}`) >= 0 )
                        return;

                  this[`_${k}`] = undefined;
                  const bindings = this.descriptor.directBindings.get( k );

                  Object.defineProperty( this, k, {
                        get(){
                              return this[`_${k}`];
                        },
                        set( value ){
                              if( value == this[`_${k}`] )
                                    return;
                              this[`_${k}`] = value;
                              

                              this.updateProperty( k );


                              if( bindings ){
                                    for( let i = 0; i < bindings.length; i++ ){
                                          bindings[i].rootNode.setAttribute( bindings[i].prop, value );
                                    }
                              }

                              const loopBindings = this.descriptor.bindings.get( k );


                              if( loopBindings ){
                                    for( let i = 0; i < loopBindings.length; i++ ){
                                          for( let j = 0; j < loopBindings[i].copies.length; j++ ){
                                                loopBindings[i].copies[j].setAttribute( loopBindings[i].prop, value );
                                          }
                                    }
                              }
                        }
                  });  
            }
            connectedCallback(){

                  if( this.hasAttributes() ){
                        for( const attr of this.attributes ){
                              this[attr.name] = attr.value;
                        }
                  }
                  this.#initializeInternalReferences( this.descriptor.dom );
            }
            /**
             * 
             * @param {string} name 
             * @param {any} oldValue 
             * @param {any} newValue 
             * @returns 
             */
            attributeChangedCallback( name, oldValue, newValue ){
                  if( oldValue == newValue )
                        return;
                  this[name] = newValue;
                  this.updateProperty( name );
            } 
            /**
             * 
             * @param {string} name 
             */
            updateProperty( name ){
                  if( this.descriptor.properties.has( name ) ){

                        const properties = this.descriptor.properties.get( name );

                        for( const prop of properties ){
                              this.#updateTemplate( prop );
                        }
                  }

                  if( this.descriptor.loopsProperties.has( name ) ){
                        const properties = this.descriptor.loopsProperties.get( name )

                        for( const prop of properties ){
                              this.#updateTemplateCopies( prop );
                        }
                  }
                  if( this.descriptor.conditionals.has( name ) ){
                        const conditionals = this.descriptor.conditionals.get( name );
                        //TODO remove this 
                        for( const cond of conditionals ){
                              if( cond.copies && cond.copies.length > 0 ){
                                    for( const c of cond.copies ){
                                          const flag = cond.condition.bind(this)(...c.scope);
                                          
                                          c.rootNode.innerHTML = '';
                                          if( flag ){
                                                c.rootNode.appendChild( c.ifCpy );
                                          }else if( c.elseCpy ){
                                                c.rootNode.appendChild( c.elseCpy );
                                          }
                                    }
                              }else{
                                    const flag = cond.condition.bind(this)();
                                    cond.rootNode.innerHTML = '';
                                    if( flag ){
                                          cond.rootNode.appendChild( cond.ifNode );
                                    }else if( cond.elseNode ){
                                          cond.rootNode.appendChild( cond.elseNode );
                                    }
                              }
                        }
                  }
            }
            /**
             * 
             * @param {HTMLElement} node 
             */
            #initializeInternalReferences( node ){
                  for( const ref of node.querySelectorAll( `[${Parser.REF_PROPERTY}]` ) ){
                        const k = ref.getAttribute( Parser.REF_PROPERTY );
                        if( this.refs[k] ){
                              continue;
                        }
                        this.refs[k] = /**@type {HTMLElement}*/(ref);
                  }
            }
            /**
             * 
             * @param {string} name 
             * @param {any[]} value 
             * @returns 
             */
            setArrayValue( name, value ){
                  if( !this.descriptor.loops.has( name ) || !(value instanceof Array) )
                        return;
                  this[name] = value;
                  const arrays = this.descriptor.loops.get( name );

                  for( let i = 0; i < arrays.length; i++ ){
                        this.updateLoopNode( arrays[i] );
                  }
            }
            /**
             * duplicate reference to <div ref="...">
             * @param {HTMLElement} node 
             */
            #duplicateReferenceToRef( node ){
                  for( const ref of node.querySelectorAll(`[${Parser.REF_PROPERTY}]`) ){
                        const k = ref.getAttribute(Parser.REF_PROPERTY);
                        if( !this.refs[k] ){
                              this.refs[k] = []; 
                        }
                        (/**@type {HTMLElement[]}*/(this.refs[k])).push(/**@type {HTMLElement}*/(ref));
                  }
            }
            /**
             * 
             * @param {HTMLElement} node 
             */
            #duplicateReferenceToBindings( node ){
                  for( const ref of node.querySelectorAll(`[${Parser.TWO_WAY_DATA_BINDING}]`) ){
                        
                        const data = ref.getAttribute( Parser.TWO_WAY_DATA_BINDING );
                        const k = parseInt( ref.getAttribute( Parser.BIND_CLASS ) );
                        const descriptor = this.descriptor.bindings.get(data)[ k ];

                        descriptor.copies.push( /**@type {HTMLElement}*/(ref) );

                        ref.addEventListener( descriptor.event, (()=>{
                              this[data] = ref[descriptor.prop];
                        }).bind(this));
                  }
            }

            /**
             * - add reference to all new nodes inside this.refs
             * - add twdb to all new nodes that are binded to anything
             * - do it recursively for each node that is a condition (if...else)
             * @param {HTMLElement} node 
             * @param {number} i 
             */
            #duplicateBindingAndRef( node, i ){

                  this.#duplicateReferenceToRef( node );
                  this.#duplicateReferenceToBindings( node );
                  
                  for( const el of node.querySelectorAll(`.${Parser.CONDITIONAL_CLASS}`) ){
                        const k = parseInt( el.getAttribute( Parser.REF_CLASS ) );
                        const descriptor = this.descriptor.idCondMap.get( k );
            
                        this.#duplicateBindingAndRef( descriptor.copies[i].ifCpy, i );

                        if( !descriptor.copies[i].elseCpy )
                              continue;

                        this.#duplicateBindingAndRef( descriptor.copies[i].elseCpy, i );
                  }
            }

            /**
             * create list filled with duplicates of model and scope 
             * @param {HTMLElement} model 
             * @param {string[]} scope
             * @param {string} variable 
             * @returns {DuplicateNode[]}
             */
            #createModelDuplicates( model, variable, scope ){
                  const list = [];
                  for( const el of this[variable] ){
                        list.push({
                              root: /**@type {HTMLElement}*/(model.cloneNode(true)),
                              scope: [...scope, el],
                        });
                  }
                  return list;
            }
            /**
             * 
             * @param {HTMLElement} cRoot 
             * @param {string} key 
             * @param {string[]} scope 
             * @param {string} variable 
             * @returns 
             */
            #duplicateConditionalTag( cRoot, key, scope, variable ){
                  const descriptor = this.descriptor.idCondMap.get( parseInt(key) );
                  let i = descriptor.copies.length;

                  if( i > this[variable].length ){
                        descriptor.copies = [];
                        i = 0;
                  }

                  descriptor.copies.push({
                        rootNode: cRoot,
                        scope: [...scope, this[variable][i]],
                        ifCpy: /**@type {HTMLElement}*/(descriptor.ifNode.cloneNode( true )),
                        elseCpy: descriptor.elseNode? 
                                    /**@type {HTMLElement}*/(descriptor.elseNode.cloneNode( true )):
                                    undefined,
                  });

                  cRoot.innerHTML = '';
                  if( descriptor.condition.bind(this)(...scope, this[variable][i]) ){
                        cRoot.appendChild( descriptor.copies[ descriptor.copies.length - 1 ].ifCpy );
                  }else if( descriptor.elseNode ){
                        cRoot.appendChild( descriptor.copies[ descriptor.copies.length - 1 ].elseCpy );   
                  }
                  for( const r of descriptor.copies[ descriptor.copies.length - 1 ].ifCpy.querySelectorAll(`.${Parser.CONDITIONAL_CLASS}`) ){
                        this.#duplicateConditionalTag( 
                              /**@type {HTMLElement}*/(r), 
                              r.getAttribute( Parser.REF_CLASS ), 
                              scope, 
                              variable 
                        );
                  }
                  if( !descriptor.copies[ descriptor.copies.length - 1 ].elseCpy )
                        return;
                  for( const r of descriptor.copies[ descriptor.copies.length - 1 ].elseCpy.querySelectorAll(`.${Parser.CONDITIONAL_CLASS}`) ){
                        this.#duplicateConditionalTag( 
                              /**@type {HTMLElement}*/(r), 
                              r.getAttribute( Parser.REF_CLASS ), 
                              scope, 
                              variable 
                        );
                  }
            }
            /**
             * @param {Readonly<DuplicateNode[]>} list 
             * @param {HTMLElement} model 
             * @param {string[]} scope 
             * @param {string} variable 
             * @returns 
             */
            #duplicateConditionalReference( list, model, scope, variable ){

                  if( !model.querySelector(`.${Parser.CONDITIONAL_CLASS}`) ){
                        return [];
                  }

                  for( const el of model.querySelectorAll(`.${Parser.CONDITIONAL_CLASS}`) ){
                        this.descriptor.idCondMap.get( parseInt( el.getAttribute( Parser.REF_CLASS ) ) ).copies = [];
                  }

                  for( const el of list ){
                        const cond = el.root.querySelectorAll(`.${Parser.CONDITIONAL_CLASS}`);
                        
                        for( const c of cond ){
                              this.#duplicateConditionalTag( 
                                    /**@type {HTMLElement}*/(c), 
                                    c.getAttribute( Parser.REF_CLASS ), 
                                    scope, 
                                    variable 
                              );
                        }

                  }
            }
            /**
             * get the reference to a property (template, binding, condition, etc...) that is used into a loop
             * @param {DuplicateNode[]} list 
             * @param {number} key 
             * @param {Ref<ReactiveProperty>} descriptor 
             */
            #getDuplicateReferenceByKey( list, key, descriptor ){
                  // check if is a condition
                  if( this.descriptor.conditionalRefSet.has( key ) ){
                        const refs = this.descriptor.idCondMap.get( this.descriptor.conditionalRefSet.get( key ) );

                        for( const n of refs.copies ){
                              let copyRoot = n.ifCpy.querySelector(`[${Parser.REF_CLASS}="${key}"]`);

                              if( !copyRoot ){
                                    copyRoot = n.elseCpy.querySelector(`[${Parser.REF_CLASS}="${key}"]`);
                              }

                              descriptor.copies.push({
                                    rootNode: /**@type {HTMLElement}*/(copyRoot),
                                    scope: n.scope,
                              });
                              
                        }
                        return;
                  }


                  for( const n of list ){

                        /**@type {HTMLElement} */
                        const copyRoot = n.root.querySelector(`[${Parser.REF_CLASS}="${key}"]`);

                        descriptor.copies.push({
                              rootNode: /**@type {HTMLElement}*/(copyRoot),
                              scope: n.scope,
                        });
                  }
            }
            /**
             * 
             * @param {HTMLElement} root 
             * @param {DuplicateNode[]} list 
             */
            #addEventsToLoop( list, root ){
                  const events = [];
                  for( const l of list ){
                        for( const eventNode of l.root.querySelectorAll(`[${Parser.EVENT_CLASS}]:not([if],[else])`) ){
                              events.push({
                                    node: eventNode,
                                    k: parseInt( eventNode.getAttribute(Parser.EVENT_CLASS) ),
                                    scope: l.scope,
                              });
                        }
                  }
                  for( const cond of this.descriptor.idCondMap.values() ){
                        for( const cpy of cond.copies ){
                              if( !root.contains(cpy.ifCpy) ){
                                    for( const eventNode of cpy.ifCpy.querySelectorAll(`[${Parser.EVENT_CLASS}]`) ){
                                          events.push({
                                                node: eventNode,
                                                k: parseInt( eventNode.getAttribute(Parser.EVENT_CLASS) ),
                                                scope: cpy.scope,
                                          });
                                    }
                              }
                              if( !cpy.elseCpy && !root.contains(cpy.elseCpy) )
                                    continue;
                              for( const eventNode of cpy.elseCpy.querySelectorAll(`[${Parser.EVENT_CLASS}]`) ){
                                    events.push({
                                          node: eventNode,
                                          k: parseInt( eventNode.getAttribute(Parser.EVENT_CLASS) ),
                                          scope: cpy.scope,
                                    });
                              } 
                        }
                  }
                  for( const {k, node, scope} of events ){
                        const eVec = this.descriptor.eventsMap.get( k );
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
             * @param {HTMLElement} root 
             * @param {DuplicateNode[]} list 
             */
            #appendList( root, list ){
                  root.innerHTML = '';
                  for( const l of list ){
                        root.appendChild( l.root );
                  }
            }

            /**
             * 
             * @param {ExternRef[]} queue 
             */
            #updateDuplicatedProperties( queue ){
                  for( const n of queue ){
                        if( C.#isRefToLoop( n ) ){
                              this.updateLoopNode( n.descriptor );
                        }else{
                              console.log(n.descriptor.attributeName)

                              this.#updateTemplateCopies( n.descriptor );
                        }
                  }
            }
            /**
             * 
             * @param {Readonly<DuplicateNode[]>} list 
             */
            #duplicateAllBindingAndRef( list ){
                  for( let i = 0; i < list.length; i++ ){
                        this.#duplicateBindingAndRef( list[i].root, i );
                  }
            }
            /**
             * 
             * @param {HTMLElement} root 
             * @param {HTMLElement} model 
             * @param {string} variable 
             * @param {string[]} scope 
             * @param {ExternRef[]} linkedProps 
             */
            #loopUpdate( root, model, variable, scope, linkedProps ){

                  /**
                   * @type {DuplicateNode[]}
                   */
                  const list = this.#createModelDuplicates( model, variable, scope );
                        //.concat( this.#appendConditionalTags( model, scope, variable ) );
                  /**
                   * @type {ExternRef[]}
                   */
                  const queue = [];

                  this.#duplicateConditionalReference( list, model, scope, variable );
                  this.#duplicateAllBindingAndRef( list );
                  
                  for( const linkToProp of linkedProps ){
                        if( !C.#isRefToLoop( linkToProp ) )
                              this.#getDuplicateReferenceByKey( list, linkToProp.key, linkToProp.descriptor );
                        queue.push( linkToProp );
                  }

                  this.#updateDuplicatedProperties( queue );
                  this.#appendList( root, list );
                  this.#addEventsToLoop( list, root );
            }
            /**
             * @param {Ref<ReactiveProperty>} prop
             */
            #updateTemplateCopies( prop ){
                  if( Boolean( prop.attributeName ) ){
                        for( const n of prop.copies ){
                              n.rootNode.setAttribute( prop.attributeName, prop.value.bind(this)(...n.scope) );
                        }
                  }else{
                        for( const n of prop.copies ){
                              n.rootNode.innerHTML = prop.value.bind(this)(...n.scope);
                        }
                  }
            }
            /**
             * @param {Ref<ReactiveProperty>} prop
             */
            #updateTemplate( prop ){
                  if( Boolean( prop.attributeName ) ){
                        prop.rootNode.setAttribute( prop.attributeName, prop.value.bind(this)() );
                  }else{
                        prop.rootNode.innerHTML = prop.value.bind(this)();
                  }
            }
            /**
            * delete all the references to <div ref="...">
            * @param {Ref<LoopDescriptor>} node  
            */
            #clearReferenceToTags( node ){
                  const references = node.rootNode.querySelectorAll(`[${Parser.REF_PROPERTY}]`);
                  
                  for( const ref of references ){
                        const refKey = ref.getAttribute(Parser.REF_PROPERTY);
                        this.refs[ refKey ] = [];
                  }
            }

            /**
            * delete all the references to <div bind="...">
            * @param {Ref<LoopDescriptor>} node  
            */
            #clearReferencesToBindings( node ){
                  const bindings = node.rootNode.querySelectorAll(`[${Parser.TWO_WAY_DATA_BINDING}]`);

                  for( const ref of bindings ){

                        const data = ref.getAttribute(Parser.TWO_WAY_DATA_BINDING);
                        const k = parseInt( ref.getAttribute(Parser.BIND_CLASS) );

                        this.descriptor.bindings.get( data )[ k ].copies = [];
                  }
            }

            /**
             * //TODO check
            * @param {Ref<LoopDescriptor>} node  
            */
            updateLoopNode( node ){

                  // RESETTING COPIES BEFORE INITIALIZING
                  for( const ref of node.refs ){
                        ref.descriptor.copies = [];
                  }

                  this.#clearReferenceToTags( node );
                  this.#clearReferencesToBindings( node );

                  if( node.copies.length <= 0 ){
                        this.#loopUpdate( 
                              node.rootNode, 
                              node.model, 
                              node.variable, 
                              [], 
                              node.refs 
                        );
                  }else{
                        for( const copy of node.copies ){
                              this.#loopUpdate( 
                                    copy.descriptor.rootNode, 
                                    node.model, 
                                    node.variable, 
                                    copy.descriptor.scope, 
                                    node.refs 
                              );
                        }
                  }
      }
      }
}

export default HTMLReactiveElement;

