// Select DOM elements to work with
const welcomeDiv = document.getElementById("WelcomeMessage");
const signInButton = document.getElementById("SignIn");
const cardDiv = document.getElementById("card-div");
const profileButton = document.getElementById("seeProfile");
const profileDiv = document.getElementById("profile-div");
const initialButtons = document.getElementById("initialButtons")
const nameInput = document.getElementById("inputName")

function showWelcomeMessage(username) {
    // Reconfiguring DOM elements
    // cardDiv.style.display = 'initial';
    // welcomeDiv.innerHTML = `Welcome ${username}`;
    signInButton.setAttribute("onclick", "signOut();");
    signInButton.setAttribute('class', "btn btn-success")
    signInButton.innerHTML = "サインアウト";
	initialButtons.style.display = ''
}

function updateUI(data, endpoint) {
    console.log('Graph API responded at: ' + new Date().toString());
    console.log(data)
	initialButtons.style.display = ''
    if (endpoint === graphConfig.graphMeEndpoint) {
        nameInput.value = data.displayName

    }
}
