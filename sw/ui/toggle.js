import { define } from '../../api.js';

define({
      name: "sw-toggle",
      template: /*html*/`
            
            <input type="checkbox" ref="_cb_"/>
            <label @click="this.refs._cb_.checked = !this.refs._cb_.checked; this.$emit('change')"/>
            &nbsp;&nbsp;&nbsp;</label>
            <style>
                  :host{
                        --round: 30px;
                        --width: 60px;
                        --height: 40px;
                        --background-color: #000;
                        --foreground-color: #fff;
                        --padding-top: 5%;
                        --padding-left: 5%;
                        --padding-right: 5%;
                        --switcher-height: 35px;
                        --switcher-width: 35px;
                        --margin-top: 0px;
                        --margin-left: 0px;
                        --margin-right: 0px;
                        --active-background-color: #61c383;
                        --animation-delay: .4s;
                  }
                  input, label, label::before {
                        position: absolute;
                  }
                  input, label {
                        top: var(--margin-top);
                        left: var(--margin-left);
                  }
                  label::before {
                        top: calc( var(--padding-top) + var(--margin-top) );
                        left: calc( var(--padding-left) + var(--margin-left) );
                  }
                  input {
                        width: var(--width);
                        height: var(--height);
                  }
                  
                  label {
                        border-radius: var(--round);
                        width: var(--width);
                        height: var(--height);
                        background-color: var(--background-color);
                        display: block !important; 
                  }
                  label::before{
                        content: " ";
                        background-color: var(--foreground-color);
                        border-radius: 50%;
                        width: var(--switcher-width);
                        height: var(--switcher-height);
                        display: block;
                  }
                  label, label::before{
                        -webkit-transition: var(--animation-delay);
                        transition: var(--animation-delay);
                  }
                  input:checked + label::before {
                        -webkit-transform: translateX( calc( var(--width) - var(--switcher-width) - var(--padding-left) - var(--padding-right)*2 ) );
                        -ms-transform: translateX( calc( var(--width) - var(--switcher-width) - var(--padding-left) - var(--padding-right)*2 ) );
                        transform: translateX( calc( var(--width) - var(--switcher-width) - var(--padding-left) - var(--padding-right)*2 ) );
                  }
                  input:checked + label {
                        background-color: var(--active-background-color);
                  }
            </style>
      `,
      props: {
            get checked(){
                  return this.refs._cb_.checked;
            },
            set checked(value){
                  if( Boolean( value ) == this.refs._cb_.checked )
                        return;
                  this.refs._cb_.checked = Boolean( value );
            }
      }
})