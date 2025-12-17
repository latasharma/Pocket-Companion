import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to PoCo',
        description: 'I am your AI companion. I am here to chat with you, listen to you, and help you with your daily tasks.',
        icon: 'heart-circle',
        color: '#10b981',
    },
    {
        id: 'voice',
        title: 'Talking to Me',
        description: 'Tap the microphone button to start speaking. Tap it again when you are done. I will listen and answer back!',
        icon: 'mic-circle',
        color: '#3b82f6',
    },
    {
        id: 'typing',
        title: 'Typing Messages',
        description: 'If you prefer, you can type messages to me using the keyboard at the bottom of the screen.',
        icon: 'keypad',
        color: '#8b5cf6',
    },
    {
        id: 'listening',
        title: 'I Can Speak',
        description: 'I will speak my answers to you. Make sure your volume is turned up so you can hear me clearly.',
        icon: 'volume-high',
        color: '#f59e0b',
    },
];

export default function TutorialScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = () => {
        router.back();
    };

    const step = TUTORIAL_STEPS[currentStep];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>How to Use</Text>
                <TouchableOpacity onPress={handleFinish} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={32} color="#6b7280" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.stepContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: `${step.color}20` }]}>
                        <Ionicons name={step.icon} size={80} color={step.color} />
                    </View>

                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>

                    <View style={styles.progressContainer}>
                        {TUTORIAL_STEPS.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === currentStep ? styles.activeDot : styles.inactiveDot,
                                    index === currentStep && { backgroundColor: step.color }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.buttonContainer}>
                    {currentStep > 0 ? (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="arrow-back" size={24} color="#6b7280" />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholderButton} />
                    )}

                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: step.color }]}
                        onPress={handleNext}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
                        </Text>
                        <Ionicons
                            name={currentStep === TUTORIAL_STEPS.length - 1 ? "checkmark" : "arrow-forward"}
                            size={24}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    stepContainer: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    stepDescription: {
        fontSize: 20,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 40,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    activeDot: {
        width: 24,
    },
    inactiveDot: {
        backgroundColor: '#e5e7eb',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#f3f4f6',
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '600',
        color: '#4b5563',
    },
    placeholderButton: {
        width: 100,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 30,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    nextButtonText: {
        marginRight: 8,
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
});
