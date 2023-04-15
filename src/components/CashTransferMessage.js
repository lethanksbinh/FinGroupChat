import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles/CashTransferMessageStyles'
import { useEffect } from 'react';
import { auth, db, firebase } from '../services/firebase';
import VoteResult from './VoteResult';

const CashTransferMessage = ({ title, type, amount, dbLocation, is_verified }) => {
  const [vote, setVote] = useState(false);
  const [message, setMessage] = useState('');
  const [acceptedUsers, setAcceptedUsers] = useState([]);
  const [declinedUsers, setDeclinedUsers] = useState([]);

  useEffect(() => {
    db.doc(dbLocation).get().then(doc => {
      const accepted = doc.data().acceptedUsers || [];
      const declined = doc.data().declinedUsers || [];

      setAcceptedUsers(accepted)
      setDeclinedUsers(declined)

      if (accepted && accepted.includes(auth.currentUser.displayName)) {
        setVote(true)
        setMessage('You accepted')
      } else if (declined && declined.includes(auth.currentUser.displayName)) {
        setVote(true)
        setMessage('You declined')
      }
    })
  }, [])

  const handleDecline = () => {
    if (vote) return;

    setVote(true)
    setMessage('You declined')
    setDeclinedUsers([...declinedUsers, auth.currentUser.displayName])

    db.doc(dbLocation).update({
      declinedUsers: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.displayName)
    })
  }

  const handleAccept = () => {
    if (vote) return;

    setVote(true)
    setMessage('You accepted')
    setAcceptedUsers([...acceptedUsers, auth.currentUser.displayName])

    const batch = db.batch()

    batch.update(db.doc(dbLocation), {
      acceptedUsers: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.displayName)
    })

    if (type === 'cash-transfer') {
      batch.update(db.doc(dbLocation.split("/messages")[0]), {
        balance: firebase.firestore.FieldValue.increment(-amount)
      })
    }
    else if (type === 'cash-transfer-request') {
      batch.update(db.doc(dbLocation.split("/messages")[0]), {
        balance: firebase.firestore.FieldValue.increment(amount)
      })

      batch.update(db.doc(`users/${auth.currentUser.uid}`), {
        balance: firebase.firestore.FieldValue.increment(-amount)
      })
    }

    batch.commit()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.senderText}>{title}</Text>

      <View style={styles.buttonContainer}>
        {(vote && type === "cash-transfer") ? (
          <VoteResult acceptedUsers={acceptedUsers} declinedUsers={declinedUsers} />
        ) : vote ? (
          <Text style={styles.senderMessage}>{message}</Text>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, vote && styles.selectedButton]}
              onPress={handleAccept}
            >
              <Text style={[styles.buttonText, vote && styles.selectedButtonText]}>Accept</Text>
            </TouchableOpacity>

            {type === 'cash-transfer' && (
              <TouchableOpacity
                style={[styles.button, vote && styles.selectedButton]}
                onPress={handleDecline}
              >
                <Text style={[styles.buttonText, vote && styles.selectedButtonText]}>Decline</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  )
}

export default CashTransferMessage