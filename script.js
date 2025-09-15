// Create floating particles animation
function createParticles() {
    const background = document.querySelector('.background-animation');
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Random size
        const size = Math.random() * 4 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random animation duration
        const duration = Math.random() * 20 + 10;
        particle.style.animationDuration = duration + 's';
        
        // Random delay
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        background.appendChild(particle);
    }
}

// Create floating textile patterns
function createTextilePatterns() {
    const background = document.querySelector('.background-animation');
    
    for (let i = 0; i < 8; i++) {
        const pattern = document.createElement('div');
        pattern.className = 'textile-pattern';
        
        // Random position
        pattern.style.left = Math.random() * 100 + '%';
        pattern.style.top = Math.random() * 100 + '%';
        
        // Random rotation
        pattern.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        // Random animation duration
        const duration = Math.random() * 30 + 20;
        pattern.style.animationDuration = duration + 's';
        
        // Random delay
        pattern.style.animationDelay = Math.random() * 10 + 's';
        
        background.appendChild(pattern);
    }
}

// Initialize animations when page loads
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    createTextilePatterns();
});
