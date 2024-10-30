# sticker 🦙
Simple html template engine for component syntax and web-component library called spiderweb not based on jsx. I suggest to use "inline html" on vs code as extension, to improve dev experience.

# WHY STICKER?

Sticker is simple, fast and lightweight library that can be used to access browser-builtin functions to a lower level than other frameworks. More than that, the sticker template engine enable no javascript site creation with more readable source code. Another cool feature of sticker is that is all open source, so you can easily read all the code and use it for whatever you like.

# INDEX
- [basic usage](#basic-usage)
- [attributes](#using-attributes)
- [md files](#use-md-files)
- [csv files](#use-csv-file)
- [dynamic components](#use-dynamic-components)
- [custom components](#custom-components)
- [custom events](#custom-events)
- [if attribute](#if-attribute)
- [for attribute](#for-attribute)
- [ref attribute](#ref-attribute)
- [bind attribute](#bind-attribute)
- [class approach](#class-approach)

## BASIC USAGE 

component.html

```html
<div>
  hello world from sticker 🦙
</div>
```

index.html

```html
<sticker>
  #use component.html as component;
</sticker>
<component></component>
```

download the repo and run the following command (after installing cargo-cli):
```bash
cargo build --release
sudo mv ./target/release/sticker /usr/local/bin
```
to have access to the cli and run

```bash
sticker
```
to see all the commands available
here are some examples:
```bash
sticker build //build the project
sticker new //initialize new sticker project
sticker comp FILE_TO_COMPILE FILE_COMPILED //compile single file
sticker update //update existing js core in the current folder
```


## USING ATTRIBUTES

component.html

```html
<div>
  hello world from sticker {{name}}
</div>
```

index.html

```html
<sticker>
  #use component.html as component;
</sticker>
<component name="🦙"></component>
```
## USE MD FILES 

you can also use .md files as components as if they where normal html components. it is compiled to html at compile time.
```html
<sticker>
  #use component.md as component;
</sticker>
<component name="🦙"></component>
```
you can also use md files and strings as template for you dynamic components, using the flag `__MARKDOWN` in your define function. 

## USE CSV FILE
\
you can also use csv files to generate custom html from templates.
for example, let's say you have a "file.csv" filled with name in the first column and surname in the second column: 
```html
<csv doc="file.csv" from="0" to="20" var="name-and-surname">
    hello name: {{name-and-surname[0]}} surname: {{name-and-surname[1]}}
</csv>
```
the property of the csv tag are:
- doc: the document used as reference
- from (optional, default 0): the row-index to use as starting point
- to (optional, default EOF): the row-index to use as ending point
- var (optional, default row): the name used as template
\
#### ADVERTISEMENT

1) you cannot use the csv file via js, it is compiled and removed at compile time
2) you cannot use tags like table, because the parser will automatically correct it.


## USE DYNAMIC COMPONENTS
From the newer version of sticker, sticker js library is replaced with spiderweb.js. Basically, spiderweb allow everything sticker could and much more. In the next months, it will be also updated and new features will be added. spiderweb.js allow you to create your own components from js, defining them as templates string (as already mentioned, use 'inline html' extension on vs code to enable better dev experience) rather than jsx. You can also reuse your components created by the template engine, simply adding the 'dynamic' keyword in the component declaration. Some examples and prototypes:

 ```html
 <div>
  hello {{name}}
</div>
 ```

 ```html
<sticker>
  #use hello.html as hello-world dynamic;
</sticker>
 ```

 \
 or using plain js syntax:
 ```javascript
import * as s from './spiderweb.js/api.js';
s.define({
  name: 'hello-world'
  template: /*html*/`
        <div>
          hello {{name}}
        </div>
  `,
})
let component = s.append('hello-world');
component.name = 'world';
 ```

the functions implemented for components creation/definition are:
 ```typescript  
 /**
 * create custom component and append it. node is document.body by default, Props is a Record<string, any> object that are set as property of the html element created.
 */
s.append(name: string, props: Object, node: HTMLElement): HTMLElement;
/**
* create custom component.
 */
s.create(name): HTMLElement;
/**
* define custom component ALREADY defined with sticker template engine and return function that specifically creates the component created
P.S.: name must contain '-' character
 */
s.define( descriptor: { 
    name: string, 
    watch: string[] | undefined, 
    props: { 
      onenter?: ()=>void, 
      onleave?: ()=>void,
      [key: string]: any }, 
    }
    template: string,
    markdown: boolean,
): (props: Record<string, any>, node: HTMLElement): HTMLCustomElement | undefined;
/**
* return the content of the loaded file
 */
s.load( filename ): Promise<string>
 ```


## CUSTOM COMPONENTS 
```typescript

export class HTMLCustomElement extends HTMLElement {

      //lifecycle hooks


      /**
      * event fired before the element is appended. Important Note: when this event is fired the first time, the references to all the properties, refs etc... are not settled yet.
      */
      onBeforeEnter()=> void;

      /**
      * event fired only the first time the element is appended. Important Note: this event is a particular case of the onenter event, but is called before it.
      */
       setup()=> void;

      /**
       * fired when the element enters the DOM
       */
      onenter(){}

      /**
      * event fired when child nodes are appended to the custom element.
      */
      onNodeAdded( event: { data: { nodeList: HTMLElement[] } })=> void

      /**
      * fired when the element leaves the DOM
      */
      onleave(){}

      //others

      /*emit new event of type eventName. the event object will have the eventData object inside the data property*/
      $emit( eventName: string, eventData: string)=>void

      /*Collection of references to html elements that lives inside the component.The elements that are also child of loops will be referenced as an array of reference. The elements that are child of conditional tag will not be added to refs*/
      refs: Object.<string, HTMLElement | HTMLElement[]>

      /*Add a global shortcut*/
       addShortcut( callback: function, ...keys: Array<string>)=> void;

      /*Remove a global shortcut previously added*/
       removeShortcut(...keys: Array<string>)=> void;
}
```
## CUSTOM EVENTS
In the template you can also listen to events, custom or not, with the following syntax:
```typescript
s.define({
      name: 'component-button',
      template: /*html*/`
            <button @click="this.count++;">Click me!</button> 
            {{ count }}
      `,
      props: {
            onenter(){
                  this.count = 0;
            }
      }
})
```
### ::once
You can also trigger the listener once with the syntax
```typescript
s.define({
      name: 'component-button',
      template: /*html*/`
            <button @click::once="this.count++;">Click me!</button> 
            {{ count }}
      `,
      props: {
            onenter(){
                  this.count = 0;
            }
      }
})
```
### $e built-in
In each custom event in the template you can also get the event properties with the **$e** variable, as follows:

```typescript
s.define({
      name: 'component-button',
      template: /*html*/`
            <button @click="console.log($e);">Click me!</button> 
      `,
})
```
## IF ATTRIBUTE
Sticker implements also conditional rendering, based on the attributes if and else. 
```typescript
s.define({
  template: /*html*/`
      <div if="this.lang == 'en'" else-id="lang">
        Hello World!
      </div>
      <div else="lang">
        Ciao Mondo!
      </div>
  `,
  watch: ['lang']
})
```
The if attribute accept a condition while the else attribute accept the e-id of the element that as the if condition. Multiple else are allowed.

## FOR ATTRIBUTE
in the template, in s.define, you can also use for attribute to create templates based on arrays
```typescript
s.define({
  ...,
  template: /*html*/`
      <ul for="name of names">
        <li>
          {{name}}
        </li>
      </ul>
  `
  ...
})
...
component.setArray('names', ['🦙','John', 'Bob', 'Karl']);
```
or, from the current implementation

```javascript
component.names = ['🦙','John', 'Bob', 'Karl'];
```
### REF ATTRIBUTE
if you want to get an html element in your component, you can, similarly to vueJs, add the attribute ref to the element, than you can refer to it directly in the code as follow:

```typescript
s.define({
  ...,
  template: /*html*/`
      <ul ref="myList">
        <li>
          {{name}}
        </li>
      </ul>
  `
  ...
})
...
component.refs.myList
```
if the ref attribute is used inside a for loop the corrisponding refs[key] will contain an array to all the elements in the loop. Also, if you use the ref attribute on a tag inside an "if", then, even if it is not attached to the dom, it will be referred inside the corrisponding refs[key].

## BIND ATTRIBUTE
if you have already worked on applications, either native apps or web apps, you know the importance of the two way data binding. this can be achieved, in sticker, with the bind property:
```typescript
s.define({
  ...,
  template: /*html*/`
      <input type="text" bind="@data = myInput"/>
  `
  ...
})
```
\
then, in your script, you can access the value of the input as follows:
```typescript
component.myInput
```
\
Obviously, as the name suggests, the variable is bound to the input tag in two ways, so you can also set the value of the input by assigning the component.myInput property. The property created is reactive, so you can also use it in your html as template, as in the example below:
```typescript
s.define({
      name: 'my-component',
      template: /*html*/`
            hello {{input}}
            <input type="text" bind="@data=input"/>
      `,
})
```
\
The bind property supports up to three different directives, that are: 
 - @data: used to assign a property of the component to the value of the tag property. It's the only required property;
 - @prop: is the property of the tag that will be bound to the @data property. Default value is 'value';
 - @event: is the event that will trigger the reload of the @data value. Default event is change. It must be a valid event;

 ## CLASS APPROACH

 spiderweb now supports the OOP style, via the SWComponent class. This is class can be extended and passed to define function, to create custom components. the template will be inserted as static property `html`.
 here is an example of a counter: 

 ```javascript

 class Counter extends SWComponent {
      static html = `
            <div>{{this.count}}</div>
            <button @click="this.add()">click</button>
      `
      //watch can be used to watch for properties that are not reactive
      static watch = [];

      constructor(){
            super();
            //please note that count cannot be initialized outside a method because is a getter
            this.count = 0;
      }

      add(){
            this.count++;
      }
 }

 define( {
      name: 'counter-component',
      component: Counter,
 })
 ```

> this method of defining components is highly recommended because is more readable and it integrates better with typescript