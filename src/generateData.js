const fs = require('fs');
const { faker } = require('@faker-js/faker');
const random = require('random');

// Generate a list of fake contacts
function generateContacts(count) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    const contact = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      age: Math.floor(Math.random() * (65 - 18 + 1)) + 18, // Random age between 18 and 65
      status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)], // Random status

    };
    contacts.push(contact);
  }
  return contacts;
}

// Generate 10,000 contacts (you can change this number)
const contacts = generateContacts(200000);

// Save the contacts as a JSON file
const outputFile = 'generatedContacts.json';
fs.writeFileSync(outputFile, JSON.stringify(contacts, null, 2));

console.log(`✅ Generated ${contacts.length} contacts and saved to ${outputFile}`);
