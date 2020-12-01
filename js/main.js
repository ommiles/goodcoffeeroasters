const header = document.querySelector('.header')
const desktopHeader = document.querySelector('.header-desktop')
desktopHeader.innerHTML = header.innerHTML

// we use in-view to get notified when a DOM element enters or exits the viewport. 👀
// https://camwiegert.github.io/in-view/
// select the thing we want to detect, whether it's in the viewport or not
// when it enters, we can run a function
// when it exits, we can run a function as well

// below, we our .header class enters the viewport, we want to hide the desktop header (removing the visible class)
// then, when the header leaves, show it (by adding the visible class)
// our function below is less than one line, so if we wanted to, we can remove the curly brackets
inView('.header')
.on('enter', el => {
    desktopHeader.classList.remove('visible')
})
.on('exit', el => {
    desktopHeader.classList.add('visible')
})

// this is how we enable the tilt library on all of our images
VanillaTilt.init(document.querySelectorAll('.image'), {
    max: 25,
    speed: 400
});

// we grab images we've given a class of fade that we want to fade in
inView ('.fade')
    // when it enters the viewport
    // grab image and run a function with it
    // and add a class named visible
    // the visible class toggles the opacity 
    .on('enter', img => img.classList.add('visible'))
    .on('exit', img => img.classList.remove('visible'))



const registerButton = document.querySelector('.register-button')
// 1. when we click the 'register' button, run a function
registerButton.addEventListener('click', event => {
    // stops any default actions from happening
    event.preventDefault()
    // 2. grab the .front element and add a class of .slide-up
    const frontEl = document.querySelector('.front')
    frontEl.classList.add('slide-up')
})

// Stripe includes a little bit of JS that we add to our page
// when card details are entered it makes what's called a token
// a very wide, non-generalized definition of a token is a representation of something in its particular ecosystem
// Tokenization is the process Stripe uses to collect sensitive card or bank account details, or personally identifiable information (PII), directly from your customers in a secure manner. 
// A token representing this information is returned to your server to use.
// Tokens cannot be stored or used more than once. 
// https://stripe.com/docs/api/tokens

// stripe test cards here: https://stripe.com/docs/testing

// all of stripe's documentation used to be written in jQuery
// they changed it to vanilla js

// stripe documentation: https://stripe.com/docs
// stripe.js elements: https://stripe.com/docs/stripe-js

// Create a Stripe client.
// this initiates / boots Stripe by using key in quotes
// the key points to our stripe account
var stripe = Stripe('pk_test_51HfgD2KYcSG7fsNvXClVloXMOnXCdIo1VfZ4bvkzEoR5rtfZNVtMIGBEpNQJqiNtOR0Cp3TCZSe9x3DX8k4sGMly00lrRO9hZ9')

// Create an instance of Elements.
// once we have access to this Stripe variable, we can use our elements
const elements = stripe.elements()

// Custom styling can be passed to options when creating an Element.
// This is CSS written into JS
const style = {
  base: {
    color: '#32325d',
    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#aab7c4'
    }
  },
  invalid: {
    color: '#fa755a',
    iconColor: '#fa755a'
  }
}

// pick the form
const form = document.querySelector('#payment-form')

// get the error tag
const errorEl = form.querySelector('#card-errors')

// get the inputs
const nameEl = form.querySelector('#name')
const emailEl = form.querySelector('#email')

// set up what happens with an error (pass in our own message)
const showErrors = msg => {
  if (msg) {
    errorEl.style.display = 'block'
    errorEl.innerHTML = msg
  } else {
    errorEl.style.display = 'none'
  }
}

// set up what happens with a stripe success
const showSuccess = () => {
  form.querySelector('.form-title').textContent = 'Payment successful!'
  form.querySelector(
    '.form-fields'
  ).textContent = `Thank you ${nameEl.value}, your payment was successful and we have sent an email receipt to ${emailEl.value}`
}

// Create an instance of the card Stripe Element.
var card = elements.create('card', {style: style})

// Add an instance of the card Element into the `card-element` <div>.
card.mount('#card-element')

// and listen out for any changes, if an error, show it!
card.addEventListener('change', function(event) {
  if (event.error) {
    showErrors(event.error.message)
  } else {
    showErrors()
  }
})

// Handle form submission.
form.addEventListener('submit', function(event) {
  event.preventDefault()
  form.classList.add('processing')
  // create a new payment method in stripe
  stripe.createPaymentMethod('card', card).then(result => {
    // when stripe returns back...
    if (result.error) {
      // invalid card format
      showErrors(result.error.message)
    } else {
      // pass my payment method to the function below
      stripeHandle(result.paymentMethod)
    }
  })
})

// Submit the form with the payment method ID.
const stripeHandle = function(paymentMethod) {
  // where do i post ajax to?
  const backendUrl = form.getAttribute('action')

  fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order: {
        name: nameEl.value,
        email: emailEl.value,
        // not a token but a payment method now!
        stripe_payment_method: paymentMethod.id,
        // IF you wanna put their own stripe secret key in,
        // USUALLY DONT DO THIS, comment next line if you wanna test
        stripe_secret_key: "sk_test_51HfgD2KYcSG7fsNv0U4P1LzLLnDQcUsiwNbJlUIaC0cLs9avzLI99p5dFDFdsMAQG4VTTtYD01qbfaUjuvFP6IwI00DSVfH4Qf"
        // BUT DONT PUT YOUR SECRET KEY IN JS ANYWHERE
        // BECAUSE PEOPLE WILL STEAL YO MONEY!
      }
    })
  })
    .then(response => response.json())
    .then(data => {
      form.classList.remove('processing')
      // back from the back-end, not Stripe!
      if (data.order) {
        // all went through fine
        console.log('all good, first time!')
        showSuccess()
      } else if (data.errors.base == 'requires_action') {
        // the API will return back something from Stripe
        // if it's needed to confirm the payment with 3D secure
        // or any other verficiation check
        stripe.handleCardPayment(data.errors.payment_intent_client_secret).then(result => {
          if (result.error) {
            // failed, said no user declined check
            console.error('failed check')
            showErrors('Please try again and confirm your payment')
          } else {
            console.log('verified check')
            // confirmed, user verified
            showSuccess()
          }
        })
      } else {
        // show stripe payment errors from the API (e.g. "not enough funds")
        console.error('stripe error', data)
        showErrors(data.errors.stripe_payment_method)
      }
    })
    .catch(error => {
      form.classList.remove('processing')
      // general message, e.g. Stripe is down
      console.error('general error', error)
      showErrors(
        `There was an error with payment, please try again or contact us at help@goodtim.es`
      )
    })
}

// grab all the anchor tags on the page
const anchors = document.querySelectorAll('a')
// loop over them
anchors.forEach(anchor => {
  // listen for clicks on each one
  anchor.addEventListener('click', event => {
    // grab the href attribute
    const href = anchor.getAttribute('href')
    // if the href starts with a #
    if (href.charAt(0) === '#') {
      // stop the default action
      event.preventDefault()
      // find the element the href points to and scroll it into view
      document.querySelector(href).scrollIntoView({
        behavior: 'smooth'
      })
    }
  })
})