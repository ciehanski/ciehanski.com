document.addEventListener('DOMContentLoaded', function() {
    var scrollpos = sessionStorage.getItem('scrollpos');
    if (scrollpos) {
        window.scrollTo(0, scrollpos);
        sessionStorage.removeItem('scrollpos');
    }
    
    window.addEventListener('scroll', function() {
        sessionStorage.setItem('scrollpos', window.scrollY);
    });
});

function saveScrollPos() {
    sessionStorage.setItem('scrollpos', window.scrollY);
}
