import React, { Component } from 'react';
import './App.css';
import Footer from "./Footer";
import Content from "./Content";
import {BrowserRouter as Router} from 'react-router-dom';
import thunk from 'redux-thunk';
import {createStore, applyMiddleware} from 'redux';
import Provider from "react-redux/src/components/Provider";
import Login from "./auth/Login";
import GameContent from "./GameContent";
import AdminContent from "./contents/AdminContent";

const store = createStore(
    (state = {}) => state, applyMiddleware(thunk)
);

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            response: '',
            logged: props.logged,
            score: props.score,
            team: props.team
        };
        Login.staticProperty.score = props.score;
        Login.staticProperty.team = props.team;
        if(this.state.logged !== 'false'){
            Login.staticProperty.username = props.logged;
        }
    }

    render() {
        const logged = this.state.logged !== 'false';
        return (
            <Provider store={store}>
                <Router>
                    <div className="App">
                        <div id="contentorgameholder">
                            {!logged && <Content logged={this.state.logged}/>}
                            {logged && <GameContent username={this.state.logged} score={this.state.score}/>}
                            </div>
                        <Footer/>
                    </div>
                </Router>
            </Provider>
        );
    }
}

export default App;
