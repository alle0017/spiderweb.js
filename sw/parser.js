
export const warning = ( message )=> console.warn(`[spider-web-log]: ${message}`);
/**
* @typedef {Object} IfPropertyMap
* @property {HTMLElement} root
* @property {HTMLElement} ifNode
* @property {HTMLElement} elseNode
* @property {Function} condition
* @property {HTMLElement[]} copies
 */
/**
 * @typedef {Object} LoopedPropertyReference
 * @property {Array<any>} scopeValues
 * @property {HTMLElement} root
*/
/**
 * @typedef {Object} PropertyDescriptor
 * @property {boolean} isAttribute
 * @property {string} attributeName
 * @property {Function} value
 * @property {HTMLElement} rootNode
 * @property {Array<string>} scope
 * @property {Array<LoopedPropertyReference>} copies
 */
/**
 * @typedef {Object.<string, Array<PropertyDescriptor>>} PropertiesUsageMap
 */
/**
 * @typedef {Object} PropertySoftRef
 * @property {PropertyDescriptor} descriptor
 * @property {boolean} isFor
 * @property {number} key
*/
/**
 * @typedef {Object} LoopDescriptor
 * @property {HTMLElement} rootNode
 * @property {HTMLElement} model
 * @property {Array<string>} scope
 * @property {string} variable
 * @property {Array<PropertySoftRef>} refs
 * @property {Array<PropertySoftRef>} copies
 */
/**
 * @typedef {Object.<string, Array<LoopDescriptor>>} LoopMap
 */

export class Parser {
      /**@readonly */
      static REF_PROPERTY = 'ref';
      /**@readonly */
      static FOR_PROPERTY = 'for';
      /**@readonly */
      static IF_PROPERTY = 'if';
      /**@readonly */
      static TWO_WAY_DATA_BINDING = 'bind';
      /**
      * @readonly
      */
      static #TEMPLATE_REGEX = /{{[^{{]+}}/gi;
      /**
      * @readonly
       */
      static #FOR_REGEX = /for[\b]*=[\b]*("|'|`)[\b]*[^"'`]+of+[^"'`]+("|'|`)/gi;
      /**
      * @readonly
       */
      static #IF_REGEX = /if[\b]*=[\b]*("|'|`)[^"'`]+("|'|`)/gi;
      /**
      * @readonly
      */
      static #PROPERTY_REGEX = /this(\.[a-zA-Z0-9_$]+|\[("|`|')[a-zA-Z0-9_$]+("|`|')\])/ig;
      /**
      * @readonly
      */
      static #BASE_KEY = 'sw-private-key';
       /**
      * @readonly
      */
       static #BASE_BIND_KEY = 'sw-private-binding-key';
      /**
      * @readonly
      */
      static #BASE_COND_CLASS = 'sw-private-class-if';
      /**
      * @readonly
      */
      static #EVENT_CLASS = 'sw-private-class-event';
      /**
      * @type {string}
      */
      static #duplicationKey;
      /**
      * @type {string}
      */
      static #eventKey;
      /**
      * @type {string}
      */
      static #bindingKey;
      /**
      * @type {string}
      */
      static #conditionalClassKey;
      /**@type {Object.<string,IfPropertyMap>}*/
      static #ifMap = {};
      /**@type {Object.<number,IfPropertyMap>}*/
      static #ifIdMap = {};
      /**@type {Object.<number, number>}*/
      static #condIdKeyMap = {};
      /**@type {LoopMap} */
      static #forMap = {};
      static #id = 1;
      /**@type {PropertiesUsageMap} */
      static #forPropertiesMap = {};
      /**events used inside loops */
      static #eventsMap = {};
      /**events that are not used inside for */
      static #events = [];
      /**bindings not initialize inside loop 
      * @type {Object.<string, Array<{
      *     node: HTMLElement,
      *     event: string,
      *     prop: string,
      * }>>}
      */
      static #directBind = {};
      /**bindings that are used inside loop 
      * @type {Object.<string, Array<{
      *     copies: HTMLElement[],
      *     event: string,
      *     prop: string,
      * }>>}
      */
      static #indirectBind = {};

      /**@hideconstructor*/
      constructor(){}
      /**
       * return all the properties used inside a string, representing an html component
       * @param {string} html 
       */
      static getUsedProperties( html ){
            const matches = html.matchAll( Parser.#TEMPLATE_REGEX );
            const forMatches = html.matchAll( Parser.#FOR_REGEX );
            const ifMatches = html.matchAll( Parser.#IF_REGEX );
            const result = [];

            if( matches ){
                  for( const m of matches ){
                        result.push( ...this.#getUsedProperties( m[0], [], [] ) );
                  }
            }
            if( forMatches ){
                  for( const m of forMatches ){
                        result.push( this.#parseForArgs( 
                              m[0]
                              .replace(/for[\b]*=[\b]*/ig, '')
                              .replace("'", '')
                              .replace('`', '')
                              .replace(/"/ig, '')
                              )[2] );
                  }
            }
            if( ifMatches ){
                  for( const m of ifMatches ){
                        result.push( ...this.#getUsedProperties( 
                              m[0]
                              .replace(/if[\b]*=[\b]*/ig, '')
                              .replace("'", '')
                              .replace('`', '')
                              .replace(/"/ig, '')
                              , [], []) );
                  }
            }
            return [...new Set(result).values()];
      }

      /**
       * parse an html string that uses spiderweb engine, into an object that represents it and that can be used inside the HTMLCustomElement class
       * @param {string} html 
       */
      static parse( html ){
            const dom = new DOMParser().parseFromString( html, "text/html" ).body;
            this.#duplicationKey = this.#adjustKey( dom, this.#BASE_KEY );
            this.#conditionalClassKey = this.#adjustKey( dom, this.#BASE_COND_CLASS );
            this.#eventKey = this.#adjustKey( dom, this.#EVENT_CLASS );
            this.#bindingKey = this.#adjustKey( dom, this.#BASE_BIND_KEY );

            const propertiesMap = this.#traverse( dom );
            const descriptor = {
                  dom,
                  properties: propertiesMap,
                  loops: this.#forMap,
                  loopsProperties: this.#forPropertiesMap,
                  key: this.#duplicationKey,
                  condKey: this.#conditionalClassKey,
                  conditionals: this.#ifMap,
                  idCondMap: this.#ifIdMap,
                  conditionalRefSet: this.#condIdKeyMap,
                  eventsMap: this.#eventsMap,
                  eventsKey: this.#eventKey,
                  events: this.#events,
                  bindings: this.#indirectBind,
                  directBindings: this.#directBind,
                  bindingKey: this.#bindingKey,
            }

            this.#indirectBind = {};
            this.#directBind = {};
            this.#eventsMap = {};
            this.#events = {};
            this.#forMap = {};
            this.#forPropertiesMap = {};
            this.#ifIdMap = {};
            this.#ifMap = {};
            this.#condIdKeyMap = {};

            return descriptor;
      }
      /**
       * return the baseKey, modified until it isn't found inside the dom
       */
      static #adjustKey( dom, baseKey ){
            while( dom.querySelector( `[${baseKey}]` ) || dom.querySelector( `.${baseKey}` ) ){
                  baseKey += Math.round( Math.random()*9 );
            }
            return baseKey;
      }
      /**
      * return the string representation of a node with the syntax <node-name [node-property-name]="[node-property-value]"/>
      * @param {HTMLElement} node  
      */
      static #nodeToString( node ){
            if( !node.attributes )
                  return `<${node.outerHTML}/>`
            let prop = '';
            for( const attr of node.attributes ){
                  prop += `${attr.name}="${attr.value}" `;
            }
            return `<${node.outerHTML} ${prop}/>`;
      }
      /**
       * return the property used inside the '{{}}' syntax
       * @param {string} inlineUsage  
       * */
      static #getUsedProperties( inlineUsage, scope, args ){
            const props = inlineUsage.match( Parser.#PROPERTY_REGEX ) || [];
            const loopParam = [];
            for( let i = 0; i < args.length; i++ ){
                  if( inlineUsage.match( new RegExp( args[ i ], 'ig' ) ) ){
                        loopParam.push( scope[ i ] );
                  }
            }

            return [ ...props, ...loopParam ].map( 
                  prop => prop
                        .replace( 'this.', '' )
                        .replace('this[', '' )
                        .replace(']', '' )
                        .replace( '`', '' )
                        .replace( "'", '' )
                        .replace(/"/ig, '')
                        .trim()
            );
      }
      /**
      * parse the arguments used inside a for attribute, the first element of the array is the variable used inside the for, the last is the array itself
      * @param {string} inline  
      * @return {[string, 'of', string]}
      */
      static #parseForArgs( inline ){
            if( !inline.match(/[a-zA-Z0-9\$_]+ of [a-zA-Z0-9\$_]+/) ){
                  return [];
            }
            return inline.split(' ').map( s => s.trim() );
      }
      /**
       * add a node used inside a for-looped tag, to the refs of the loop
       * @param {PropertyDescriptor} descriptorRef 
       * @param {string[]} scope 
       * @param {boolean} isFor if the element saved is for
       * @example
      ```html
      <div for="a of array">
      {{this.log}}
      </div>
      ``` 
      // save inside referenceMap[array].refs the object
      ```javascript
      {
            isFor: false,
            descriptor: [reference-to-"log"-descriptor]
            key: [the unique id used to identify this.log]
      }   
      ```  
       */
      static #addReferenceToLoop( descriptorRef, scope, isFor ){
            const loop = this.#forMap[ scope[ scope.length - 1 ] ];
            const key = descriptorRef.rootNode.getAttribute( this.#duplicationKey ) || this.#id;
            loop[ loop.length - 1 ].refs.push({
                  key,
                  descriptor: descriptorRef,
                  isFor,
            });
            if( descriptorRef.rootNode.hasAttribute( this.#duplicationKey ) )
                  return;
            descriptorRef.rootNode.setAttribute( this.#duplicationKey, this.#id );
            this.#id++;
      }
      /**
       * 
       * @param {HTMLElement} rootNode html node that host the attribute. can be span by default or the actual element with the variable attribute
       * @param {string} inlineFunction function that will be executed to define the template value
       * @param {string[]} scope array of arrays names 
       * @param {string | undefined} attributeName the attribute name, if specified,that is dynamically generated
       * @param {string[]} args variables used as parameters for the function
       * @param {boolean} isAttribute 
       */
      static #createPropertyDescriptor( rootNode, inlineFunction, scope, attributeName, args, isAttribute ){
            return {
                  isAttribute,
                  value: new Function( ...args, `return ${inlineFunction.replace('{{', '').replace('}}', '')}` ),
                  rootNode,
                  scope,
                  copies: [], 
                  attributeName,
            }
      }
      /**
       * 
       * @param {PropertiesUsageMap} map 
       * @param {Object} descriptor 
       * @param {string} prop the property that is used in the inline function
       * @param {string[]} scope 
       */
      static #addToMap( map, descriptor, prop, scope = [] ){
            if( !map[ prop ] ){
                  map[ prop ] = [];
            }
            map[ prop ].push(descriptor);
            if( scope.length <= 0 )
                  return;

            this.#addReferenceToLoop(
                  map[prop][map[ prop ].length - 1],
                  scope,
                  false,
            );
      }


      /**
       * 
       * @param {PropertiesUsageMap} map 
       * @param {HTMLElement} node 
       * @param {boolean} isAttribute 
       * @returns 
       */
      static #add( map, node, isAttribute, scope = [], args = [] ){
            
            if( isAttribute ){
                  for( const attr of node.attributes ){
                        if( !attr.value.match( Parser.#TEMPLATE_REGEX ) )
                              continue;
                        const descriptor = this.#createPropertyDescriptor( 
                              node, 
                              attr.value, 
                              scope, 
                              attr.name, 
                              args, 
                              true );
                        this
                              .#getUsedProperties( attr.value, scope, args )
                              .forEach( prop => this.#addToMap( 
                                    map,
                                    descriptor, 
                                    prop,
                                    scope,
                              ) );
                  }
                  return;
            }
            if( node.nodeType !== Node.TEXT_NODE ) 
                  return;

            const text = node.textContent;
            const matches = text.match( Parser.#TEMPLATE_REGEX );
            const newNodeList = [];
            let prev = 0;

            for( let i = 0; i < matches.length; i++ ){
                  const span = document.createElement( 'span' );
                  let current = text.indexOf( matches[i], prev );
                  const descriptor = this.#createPropertyDescriptor( 
                        span, 
                        matches[i], 
                        scope, 
                        undefined, 
                        args, 
                        false );
                  newNodeList.push( 
                        text.substring( 
                              prev,
                              current,
                        ),
                        span
                  );

                  this
                        .#getUsedProperties( matches[i], scope, args )
                        .forEach( prop => this.#addToMap( 
                              map,
                              descriptor, 
                              prop,
                              scope,
                        ) );
                  prev = current + matches[i].length;
                  
            }
            node.replaceWith(...newNodeList, text.substring( prev ) );
      }
      /**
       * 
       * @param {HTMLElement} node 
       * @param {Array<string>} args 
       * @param {string[]} scope 
       * @param {string[]} params 
       */
      static #setForProperties( node, args, scope, params ){
            const rootNode = document.createElement( 'span' );
            node.replaceWith( rootNode );
            if( !this.#forMap[args[2]] )
                  this.#forMap[args[2]] = []; 
            this.#forMap[args[2]].push( {
                  rootNode,
                  model: node,
                  scope: [...scope, args[2]],
                  variable: args[2],
                  refs: [],
                  copies: [],
            });  


            if( scope.length > 0 ){
                  this.#addReferenceToLoop(
                        this.#forMap[args[2]][this.#forMap[args[2]].length - 1],
                        scope,
                        true,
                  );
            }
            if( node.hasChildNodes() ){
                  for( const child of node.childNodes ){
                        this.#mergeMaps(
                              this.#forPropertiesMap,
                              this.#traverse( child, args, [...scope, args[2]], [...params, args[0]] ),
                        )
                  }
            }
      }
      static #mergeMaps( map, childMap ){
            for( let [k,v] of Object.entries( childMap ) ){
                  if( map[k] ){
                        map[k] = [ ...map[k], ...v ]
                  }else{
                        map[k] = v
                  }
            }
      }
      /**
      * search for attribute and initialize the corresponding map
      * @param {HTMLElement} node  
      * @param {string[]} scope
      * @param {string[]} params
      */
      static #traverseFor( node, scope, params ){
            const args = this.#parseForArgs( node.getAttribute( Parser.FOR_PROPERTY ) );
            if( args.length != 3 ){
                  warning(`Invalid "for" syntax: ${node.getAttribute( Parser.FOR_PROPERTY )}`);
                  return;
            }
            this.#setForProperties( node, args, scope, params )
            return;
      }
      /**
       * 
       * @param {*} map 
       * @param {HTMLElement} ifNode 
       * @param {*} scope 
       * @param {*} params
       */
      static #addIfToMap( map, ifNode, args, scope, params = [] ){
            const propMap = {};
            const inline = ifNode.getAttribute(Parser.IF_PROPERTY)
            const rootNode = document.createElement( 'span' );
            const elseNode =  ifNode.parentNode.querySelector( `[else="${ifNode.getAttribute('e-id')}"]`);
            const id = this.#id;
            const props = this.#getUsedProperties( 
                                    inline, 
                                    scope, 
                                    params
                              );
            const descriptor = {
                  root: rootNode,
                  ifNode,
                  elseNode,
                  condition: new Function( ...params, `return ${inline}` ),
                  copies: [],
            }
            
            rootNode.classList.add( this.#conditionalClassKey );
            rootNode.setAttribute(this.#duplicationKey, id );
            this.#id++;
            ifNode.replaceWith( rootNode );
            
            for( const prop of props ){
                  if( !map[prop] ){
                        map[prop] = [];
                  }
                  map[prop].push( descriptor );
                  
            }
            this.#ifIdMap[id] = descriptor; 
            if( ifNode.hasChildNodes() ){
                  for( const c of ifNode.childNodes ){
                        this.#mergeMaps( 
                              propMap, 
                              this.#traverse(
                                    c,
                                    args,
                                    scope,
                                    params
                              )
                        );
                  }
            }
            if( elseNode ){
                  this.#mergeMaps( 
                        propMap, 
                        this.#traverse(
                              elseNode,
                              args,
                              scope,
                              params
                        )
                  );
                  elseNode.remove();
            }
            if( scope.length > 0 ){
                  for( const n of ifNode.querySelectorAll(`[${this.#duplicationKey}]`) ){
                        this.#condIdKeyMap[n.getAttribute(this.#duplicationKey)] = id;
                  }
                  if( elseNode ){
                        for( const n of elseNode.querySelectorAll(`[${this.#duplicationKey}]`) ){
                              this.#condIdKeyMap[n.getAttribute(this.#duplicationKey)] = id;
                        }
                  }
            }
            return propMap;
            
      }
      /**
       * 
       * @param {HTMLElement} node 
       * @param {string[]} scope 
       * @param {string[]} args
       */
      static #searchEvents( node, scope = [], args = [] ){
            if( !node.hasAttributes() ){
                  return;
            }
            for( const attr of node.attributes ){
                  if( !attr.name.match(/@[a-z0-9](::once)?/) )
                        continue;
                  let once = false;
                  const value = new Function( ...args, '$e', attr.value );
                  
                  const ev = attr.name
                        .replace( '@', '' )
                        .replace( '::once', '' );
                  
                  if( attr.name.indexOf('::once') >= 0 ){
                        once = true;
                  }
                  if( scope.length > 0 ){
                        if( !node.hasAttribute( this.#eventKey ) ){
                              node.setAttribute( this.#eventKey, this.#id );
                              this.#eventsMap[ this.#id ] = [{
                                    once,
                                    scope,
                                    value,
                                    name: ev,
                              }];
                              this.#id++;
                        }else{
                              this.#eventsMap[ node.getAttribute( this.#eventKey ) ].push({
                                    once,
                                    scope,
                                    value,
                                    name: ev,
                              });
                        }
                        
                        
                  }else{
                        this.#events.push({
                              once,
                              value,
                              name: ev,
                              node: node,
                        })
                  }
            }
            
      }
      /**
       * 
       * @param {string} bind 
       */
      static #parseBindingProperties( bind ){
            let data = bind.match(/@data *= *[a-zA-Z0-9$_]+/ig);
            let prop = bind.match(/@prop *= *[a-zA-Z0-9$_]+/ig);
            let event = bind.match(/@event *= *[a-zA-Z0-9$_]+/ig);

            if( !data ){
                  warning(' invalid binding. No property to bind');
                  return undefined;
            }
            data = data[0]
                  .replace('@data', '')
                  .replace('=', '')
                  .replace(' ', '');

            if( prop ){
                  prop = prop[0]
                  .replace('@prop', '')
                  .replace('=', '')
                  .replace(' ', '');
            }else{
                  prop = 'value';
            }
            if( event ){
                  event = event[0]
                  .replace('@event', '')
                  .replace('=', '')
                  .replace(' ', '');
            }else{
                  event = 'change';
            }

            return {
                  data,
                  prop,
                  event,
            }
      }
      static #setBinding( node, scope = [] ){
            const { data, prop, event } = this.#parseBindingProperties( 
                  node.getAttribute( Parser.TWO_WAY_DATA_BINDING ) 
            );
            if( data && scope.length > 0 ){
                  if( !this.#indirectBind[data] )
                        this.#indirectBind[data] = {};
                  this.#indirectBind[data][this.#id] = {
                              copies: [],
                              event,
                              prop,
                        };
                  node.setAttribute( Parser.TWO_WAY_DATA_BINDING, data );
                  node.setAttribute( Parser.#bindingKey, this.#id );
                  this.#id++;
            }else if( data ){
                  if( !this.#directBind[data] )
                        this.#directBind[data] = [];
                  this.#directBind[data].push({
                              node,
                              event,
                              prop,
                        });
                  
            }
      }
      /**@param {HTMLElement} node  */
      static #traverse( node, args, scope, params ){
            /**@type {PropertiesUsageMap} */
            const map = {};
            const nodeToString = Parser.#nodeToString( node );
            if( node.nodeType == Node.TEXT_NODE ){
                  if( !node.textContent.match( Parser.#TEMPLATE_REGEX ) ) 
                        return map;
                  this.#add( map, node, false, scope, params );
                  return map;
            }
            this.#searchEvents( node, scope, args );
            if( node.hasAttribute(Parser.IF_PROPERTY) ){
                  this.#mergeMaps( 
                        map, 
                        this.#addIfToMap( this.#ifMap, node, args, scope, params  )
                  );
                  return map;
            }

            if( node.hasAttribute(Parser.FOR_PROPERTY) ){
                  if( args ){
                        this.#traverseFor( node, scope, params );
                  }else{
                        this.#traverseFor( node, [], [] );
                  }
                  return {}
            }
            if( node.hasAttribute( Parser.TWO_WAY_DATA_BINDING ) ){
                  this.#setBinding( node, scope );
            }
            if( nodeToString.match( Parser.#TEMPLATE_REGEX ) ){
                  this.#add( map, node, true, scope, params );
            }

            if( !node.hasChildNodes() )
                  return map;

            for( const c of [...node.childNodes] ){
                  const cMap = this.#traverse(c, args, scope, params );
                  this.#mergeMaps( map, cMap );
            }
            return map;
      }
}
