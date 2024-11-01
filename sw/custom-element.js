import { Parser, warning } from "./compiler.js";
import HTMLReactiveElement from "./html-reactive-element.js";
import SWComponent from "./swcomponent.js";


/**
 * @param {string} html 
 * @param {string[]} watch
 * @returns {ReactiveCloneable}
 */
export const toCloneable = (html, watch = []) =>{
      const parser = new Parser();
      const cloneable = parser.createReactiveCloneable( html );



      for( let i=0; i < watch.length; i++ ){
            cloneable.usedProperties.add( watch[ i ] );
      }

      return cloneable;
}

/**
 * @param {string} html 
 * @returns {ReactiveCloneable}
 */
export const defaultCloneable = ( html )=>{
      return {
            dom:  new DOMParser().parseFromString( html, "text/html" ).body,
            properties: new Map(),
            loops: new Map(),
            loopsProperties: new Map(),
            conditionals: new Map(),
            events: [],
            bindings: new Map(),
            directBindings: new Map(),
            conditionalRefSet: new Map(),
            eventsMap: new Map(),
            usedProperties: new Set(),
      };
}



/**
 * @param {string} name
 * @param {string} html 
 * @param {boolean} __NO_COMPILE
 * @param {Object} extender,
 * @param {string[]} watch
 */
export const createCustomExtensibleElement = ( name, html, __NO_COMPILE, extender = {}, watch = [] )=>{

      
      /*const parser = new Parser();
      const cloneable = parser.createReactiveCloneable( html );



      for( let i=0; i < watch.length; i++ ){
            cloneable.usedProperties.add( watch[ i ] );
      }*/
      let cloneable;

      if( __NO_COMPILE ){
            cloneable = defaultCloneable( html );
      }else{
            cloneable = toCloneable( html, watch );
      }

      customElements.define( name, HTMLReactiveElement.__extendClass__( class extends SWComponent {
            static cloneable = cloneable;
            static observedAttributes = [...cloneable.usedProperties.values()];
            static __NO_COMPILE = __NO_COMPILE;
      }, extender ) );
}
/**
 * @param {string} name
 * @param {typeof SWComponent} element
 * @param {boolean} __NO_COMPILE
 */
export const createCustomElement = ( name, element, __NO_COMPILE )=>{

      /*element.cloneable = new Parser().createReactiveCloneable( element.html );

      for( let i=0; i < element.watch.length; i++ ){
            element.cloneable.usedProperties.add( element.watch[ i ] );
      }*/

      if( __NO_COMPILE ){
            element.cloneable = defaultCloneable( element.html );
            element.__NO_COMPILE = true;
      }else{
            element.cloneable = toCloneable( element.html, element.watch );
      }


      element.observedAttributes = [...element.cloneable.usedProperties.values()];

      customElements.define( name, element );
}


/**
 * @typedef {Object} CustomProperties
 * @property  {( eventName: string, eventData: string)=>void} $emit emit new event of type eventName. the event object will have the eventData object inside the data property
 * @property {Object.<string, HTMLElement | HTMLElement[]>} refs Collection of references to html elements that lives inside the component.The elements that are also child of loops will be referenced as an array of reference. The elements that are child of conditional tag will not be added to refs
 * @property {( callback: function, ...keys: Array<string>)=> void} addShortcut Add a global shortcut
 * @property {(...keys: Array<string>)=> void} removeShortcut Remove a global shortcut previously added
 * @property {()=> void} onenter event fired each time the element is appended to the dom
 * @property {()=> void} onleave event fired each time the element is removed from the dom
 * @property {()=> void} setup event fired only the first time the element is appended. Important Note: this event is a particular case of the onenter event, but is called before it.
 * @property {()=> void} onBeforeEnter event fired before the element is appended. Important Note: when this event is fired the first time, the references to all the properties, refs etc... are not settled yet.
 * @property {( event: { data: { nodeList: HTMLElement[] } })=> void} onNodeAdded event fired when child nodes are appended to the custom element.
 * 
 * 
 * @typedef {CustomProperties & HTMLElement} HTMLCustomElement
 */