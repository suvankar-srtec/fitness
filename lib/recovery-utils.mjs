// Only transient read failures should bypass blocking message dialogs.
export function isTransientConnectionMessage(message){
 return typeof message==='string'&&(
  message.startsWith('The request took too long.')||
  message.startsWith('Unable to connect to the server.')||
  message.startsWith('Unable to load data. Please retry.')||
  message.startsWith('Unable to read the server response.')
 );
}
